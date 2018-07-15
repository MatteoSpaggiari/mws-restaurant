/**
 * Common database helper functions.
 */
(function() {
  function toArray(arr) {
    return Array.prototype.slice.call(arr);
  }

  function promisifyRequest(request) {
    return new Promise(function(resolve, reject) {
      request.onsuccess = function() {
        resolve(request.result);
      };

      request.onerror = function() {
        reject(request.error);
      };
    });
  }

  function promisifyRequestCall(obj, method, args) {
    var request;
    var p = new Promise(function(resolve, reject) {
      request = obj[method].apply(obj, args);
      promisifyRequest(request).then(resolve, reject);
    });

    p.request = request;
    return p;
  }

  function promisifyCursorRequestCall(obj, method, args) {
    var p = promisifyRequestCall(obj, method, args);
    return p.then(function(value) {
      if (!value) return;
      return new Cursor(value, p.request);
    });
  }

  function proxyProperties(ProxyClass, targetProp, properties) {
    properties.forEach(function(prop) {
      Object.defineProperty(ProxyClass.prototype, prop, {
        get: function() {
          return this[targetProp][prop];
        },
        set: function(val) {
          this[targetProp][prop] = val;
        }
      });
    });
  }

  function proxyRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return promisifyRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function proxyMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return this[targetProp][prop].apply(this[targetProp], arguments);
      };
    });
  }

  function proxyCursorRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return promisifyCursorRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function Index(index) {
    this._index = index;
  }

  proxyProperties(Index, '_index', [
    'name',
    'keyPath',
    'multiEntry',
    'unique'
  ]);

  proxyRequestMethods(Index, '_index', IDBIndex, [
    'get',
    'getKey',
    'getAll',
    'getAllKeys',
    'count'
  ]);

  proxyCursorRequestMethods(Index, '_index', IDBIndex, [
    'openCursor',
    'openKeyCursor'
  ]);

  function Cursor(cursor, request) {
    this._cursor = cursor;
    this._request = request;
  }

  proxyProperties(Cursor, '_cursor', [
    'direction',
    'key',
    'primaryKey',
    'value'
  ]);

  proxyRequestMethods(Cursor, '_cursor', IDBCursor, [
    'update',
    'delete'
  ]);

  // proxy 'next' methods
  ['advance', 'continue', 'continuePrimaryKey'].forEach(function(methodName) {
    if (!(methodName in IDBCursor.prototype)) return;
    Cursor.prototype[methodName] = function() {
      var cursor = this;
      var args = arguments;
      return Promise.resolve().then(function() {
        cursor._cursor[methodName].apply(cursor._cursor, args);
        return promisifyRequest(cursor._request).then(function(value) {
          if (!value) return;
          return new Cursor(value, cursor._request);
        });
      });
    };
  });

  function ObjectStore(store) {
    this._store = store;
  }

  ObjectStore.prototype.createIndex = function() {
    return new Index(this._store.createIndex.apply(this._store, arguments));
  };

  ObjectStore.prototype.index = function() {
    return new Index(this._store.index.apply(this._store, arguments));
  };

  proxyProperties(ObjectStore, '_store', [
    'name',
    'keyPath',
    'indexNames',
    'autoIncrement'
  ]);

  proxyRequestMethods(ObjectStore, '_store', IDBObjectStore, [
    'put',
    'add',
    'delete',
    'clear',
    'get',
    'getAll',
    'getKey',
    'getAllKeys',
    'count'
  ]);

  proxyCursorRequestMethods(ObjectStore, '_store', IDBObjectStore, [
    'openCursor',
    'openKeyCursor'
  ]);

  proxyMethods(ObjectStore, '_store', IDBObjectStore, [
    'deleteIndex'
  ]);

  function Transaction(idbTransaction) {
    this._tx = idbTransaction;
    this.complete = new Promise(function(resolve, reject) {
      idbTransaction.oncomplete = function() {
        resolve();
      };
      idbTransaction.onerror = function() {
        reject(idbTransaction.error);
      };
      idbTransaction.onabort = function() {
        reject(idbTransaction.error);
      };
    });
  }

  Transaction.prototype.objectStore = function() {
    return new ObjectStore(this._tx.objectStore.apply(this._tx, arguments));
  };

  proxyProperties(Transaction, '_tx', [
    'objectStoreNames',
    'mode'
  ]);

  proxyMethods(Transaction, '_tx', IDBTransaction, [
    'abort'
  ]);

  function UpgradeDB(db, oldVersion, transaction) {
    this._db = db;
    this.oldVersion = oldVersion;
    this.transaction = new Transaction(transaction);
  }

  UpgradeDB.prototype.createObjectStore = function() {
    return new ObjectStore(this._db.createObjectStore.apply(this._db, arguments));
  };

  proxyProperties(UpgradeDB, '_db', [
    'name',
    'version',
    'objectStoreNames'
  ]);

  proxyMethods(UpgradeDB, '_db', IDBDatabase, [
    'deleteObjectStore',
    'close'
  ]);

  function DB(db) {
    this._db = db;
  }

  DB.prototype.transaction = function() {
    return new Transaction(this._db.transaction.apply(this._db, arguments));
  };

  proxyProperties(DB, '_db', [
    'name',
    'version',
    'objectStoreNames'
  ]);

  proxyMethods(DB, '_db', IDBDatabase, [
    'close'
  ]);

  // Add cursor iterators
  // TODO: remove this once browsers do the right thing with promises
  ['openCursor', 'openKeyCursor'].forEach(function(funcName) {
    [ObjectStore, Index].forEach(function(Constructor) {
      Constructor.prototype[funcName.replace('open', 'iterate')] = function() {
        var args = toArray(arguments);
        var callback = args[args.length - 1];
        var nativeObject = this._store || this._index;
        var request = nativeObject[funcName].apply(nativeObject, args.slice(0, -1));
        request.onsuccess = function() {
          callback(request.result);
        };
      };
    });
  });

  // polyfill getAll
  [Index, ObjectStore].forEach(function(Constructor) {
    if (Constructor.prototype.getAll) return;
    Constructor.prototype.getAll = function(query, count) {
      var instance = this;
      var items = [];

      return new Promise(function(resolve) {
        instance.iterateCursor(query, function(cursor) {
          if (!cursor) {
            resolve(items);
            return;
          }
          items.push(cursor.value);

          if (count !== undefined && items.length == count) {
            resolve(items);
            return;
          }
          cursor.continue();
        });
      });
    };
  });

  var exp = {
    open: function(name, version, upgradeCallback) {
      var p = promisifyRequestCall(indexedDB, 'open', [name, version]);
      var request = p.request;

      request.onupgradeneeded = function(event) {
        if (upgradeCallback) {
          upgradeCallback(new UpgradeDB(request.result, event.oldVersion, request.transaction));
        }
      };

      return p.then(function(db) {
        return new DB(db);
      });
    },
    delete: function(name) {
      return promisifyRequestCall(indexedDB, 'deleteDatabase', [name]);
    }
  };

  if (typeof module !== 'undefined') {
    module.exports = exp;
    module.exports.default = module.exports;
  }
  else {
    self.idb = exp;
  }
}());

class DBHelper {
    
    /**
    * Database URL Restaurants.
    */
    static RESTAURANTS_DATABASE_URL(id = null) {
        const port = 1337; // Change this to your server port
        if(id) {
            return `http://localhost:${port}/restaurants/${id}`;
        } else {
            return `http://localhost:${port}/restaurants/`;
        }
    }
    
    /**
    * Database URL Reviews.
    */
    static REVIEWS_DATABASE_URL(restaurant_id = null) {
        const port = 1337; // Change this to your server port
        if(restaurant_id) {
            return `http://localhost:${port}/reviews/?restaurant_id=${restaurant_id}`;
        } else {
            return `http://localhost:${port}/reviews/`;
        }
    }
    
    static openAdviseUser(advise,type) {
        const modalOverlay = document.querySelector('.modal-overlay');
        modalOverlay.style.zIndex = 9;
        const info_box = document.createElement("div");
        info_box.classList.add("info-box");
        const message = document.createElement("p");
        message.innerHTML = advise;
        info_box.appendChild(message);
        document.body.appendChild(info_box);
        if(type == "reload") {
            setTimeout(function(){ 
                location.reload(true);
            }, 3000);
        } else if(type == "hide") {
            setTimeout(function(){
                modalOverlay.style.display = "none";
                info_box.style.display = "none";
            }, 3000);
        }
    }
    
    /**
    * Static method used to open the database (IDB) and get a dbPromise
    */
    static openDatabase() {
        // If the browser doesn't support service worker,
        // we don't care about having a database
        if (!navigator.serviceWorker) {
            return Promise.resolve();
        }

        return idb.open('restaurants-review', 1, function(upgradeDb) {
            let restaurantsStore;
            let reviewsStore;
            let reviewsOfflineStore;
            let favoritesRestaurantsOfflineStore;
            switch(upgradeDb.oldVersion) {
		case 0:
                    restaurantsStore = upgradeDb.createObjectStore('restaurants', {keyPath: 'id', autoIncrement: true});
                case 1:
                    reviewsStore = upgradeDb.createObjectStore('reviews', {keyPath: 'id', autoIncrement: true});
                    reviewsStore.createIndex('restaurant_id','restaurant_id',{ unique: false });
                case 2: 
                    reviewsOfflineStore = upgradeDb.createObjectStore('reviews-offline', {keyPath: 'id', autoIncrement: true});
                case 3: 
                    favoritesRestaurantsOfflineStore = upgradeDb.createObjectStore('favorites-restaurants-offline', {keyPath: 'id'});
            }
        });
    }
    
    /**
    * Static method used to insert / update data of the Restaurants obtained from the server in the Browser database (IDB)
    */
    static putValuesRestaurantsDatabase() {
        //Add Restaurants Database
        fetch(DBHelper.RESTAURANTS_DATABASE_URL()).then(function(response) {
            if(response.ok) {
                return response.json();
            } else {
                const error = "Data not loaded";
                return error;
            }
        }).then(function(restaurants) {
            const dbPromise = DBHelper.openDatabase();
            dbPromise.then(function(db) {
                const tx = db.transaction('restaurants','readwrite');
                const restaurantsStore = tx.objectStore('restaurants');  
                for(let i = 0;i < restaurants.length;i++) {
                    restaurantsStore.put(restaurants[i]);
                };
                return  tx.complete;
            }).then(function() {
                console.log('Add restaurants');
            }).catch(function() {
                console.log('Transaction failed');
            });
        }).catch(function() {
            const error = "Network error";
            return error;
        });
    }
    
    /**
    * Static method to make a restaurant become a favorite
    */
    static putIsFavoriteRestaurantDatabase(id_restaurant, favorite, favoriteHTML) {
        let is_favorite;
        //Update Favorite Restaurant Database
        if(String(favorite) == "true") {
            is_favorite = '/?is_favorite=false';
            
        } else {
            is_favorite = '/?is_favorite=true';
        }
        console.log(DBHelper.RESTAURANTS_DATABASE_URL(id_restaurant)+is_favorite);
        fetch(DBHelper.RESTAURANTS_DATABASE_URL(id_restaurant)+is_favorite,{ method: 'PUT', "Accept-Charset": "utf-8", "Content-Type": "application/json" }).then(function(response) {
            if(response.ok) {
                return response.json();
            } else {
                const error = "Data not loaded";
                return error;
            }
        }).then(function(restaurant) {
            if(String(restaurant.is_favorite) == "true") {
                favoriteHTML.innerHTML = '&#9733;';
                favoriteHTML.setAttribute('data-favorite','true');
            } else {
                favoriteHTML.innerHTML = '&#9734;';
                favoriteHTML.setAttribute('data-favorite','false');
            }
            const dbPromise = DBHelper.openDatabase();
            dbPromise.then(function(db) {
                const tx = db.transaction('restaurants','readwrite');
                const restaurantsStore = tx.objectStore('restaurants');  
                restaurantsStore.put(restaurant);
                return tx.complete;
            }).then(function() {
                console.log('Update favorite restaurant');
            }).catch(function() {
                console.log('Transaction failed');
            });
        }).catch(function() {
            DBHelper.putOfflineIsFavoriteRestaurantDatabase(id_restaurant, favorite, favoriteHTML);
            const error = "Network error";
            return error;
        });
    }
    
    /**
    * Static method used to insert / update data of the Reviews obtained from the server in the Browser database (IDB)
    */
    static putValuesReviewsDatabase() {
        //Add Reviews Database
        fetch(DBHelper.REVIEWS_DATABASE_URL()).then(function(response) {
            if(response.ok) {
                return response.json();
            } else {
                const error = "Data not loaded";
                return error;
            }
        }).then(function(reviews) {
            const dbPromise = DBHelper.openDatabase();
            dbPromise.then(function(db) {
                const tx = db.transaction('reviews','readwrite');
                const reviewsStore = tx.objectStore('reviews');  
                for(let i = 0;i < reviews.length;i++) {
                    reviewsStore.put(reviews[i]);
                };
                return  tx.complete;
            }).then(function() {
                console.log('Add reviews');
            }).catch(function() {
                console.log('Transaction failed');
            });
        }).catch(function() {
            const error = "Network error";
            return error;
        });
    }
    
    /**
    * Static method used to insert / update data offline of the Review obtained from the form in the Browser database (IDB)
    */
    static putOfflineValuesReviewDatabase(data_review, data_offline_review) {
        //Add Review Database
        const dbPromise = DBHelper.openDatabase();
        dbPromise.then(function(db) {
            const tx = db.transaction(['reviews','reviews-offline'],'readwrite');
            const reviewsStore = tx.objectStore('reviews');  
            reviewsStore.put(data_review);
            const reviewsOfflineStore = tx.objectStore('reviews-offline');  
            reviewsOfflineStore.put(data_offline_review);
            return  tx.complete;
        }).then(function() {
            console.log('Add review');
            const advise = "No connection, the review will be sent as soon as possible thanks";
            DBHelper.openAdviseUser(advise,'reload');
        }).catch(function() {
            console.log('Transaction failed');
        });
    }
    
    /**
    * Static method used to insert / update data offline of the Review obtained from the form in the Browser database (IDB)
    */
    static putOfflineIsFavoriteRestaurantDatabase(id_restaurant, favorite, favoriteHTML) {
        //Add Favorite Restaurant Database
        let is_favorite;
        //Update Favorite Restaurant Database
        if(String(favorite) == "true") {
            is_favorite = 'false';
            
        } else {
            is_favorite = 'true';
        }
        const data_offline_favorite_restaurant = {
            "id" : id_restaurant,
            "is_favorite" : String(is_favorite)
        };
        const dbPromise = DBHelper.openDatabase();
        dbPromise.then(function(db) {
            const tx = db.transaction('restaurants','readwrite');
            const restaurantsStore = tx.objectStore('restaurants');  
            return restaurantsStore.get(id_restaurant);
        }).then(function(restaurant) {
            if(String(favorite) == "true") {
                restaurant.is_favorite = "false";
            } else {
                restaurant.is_favorite = "true";
            }
            const dbPromise = DBHelper.openDatabase();
            dbPromise.then(function(db) {
                const tx = db.transaction(['restaurants','favorites-restaurants-offline'],'readwrite');
                const restaurantsStore = tx.objectStore('restaurants'); 
                restaurantsStore.put(restaurant);
                const favoritesRestaurantsOfflineStore = tx.objectStore('favorites-restaurants-offline');  
                favoritesRestaurantsOfflineStore.put(data_offline_favorite_restaurant);
                return tx.complete;
            }).then(function() {
                if(favorite == "true") {
                    favoriteHTML.innerHTML = '&#9734;';
                    favoriteHTML.setAttribute('data-favorite','false');
                } else {
                    favoriteHTML.innerHTML = '&#9733;';
                    favoriteHTML.setAttribute('data-favorite','true');
                }
                console.log('Update favorite restaurant');
                const advise = "No connection, the favorites restaurants will be sent as soon as possible thanks";
                DBHelper.openAdviseUser(advise,"hide");
            });
        }).catch(function() {
            console.log('Transaction failed');
        });
    }
    
    /**
    * Static method used to load data of the Restaurants from the browser database (IDB)
    */
    static getRestaurantsValuesDatabase(id = null, callback) {
        if(id) {
            const dbPromise = DBHelper.openDatabase();
            dbPromise.then(function(db) {
                const tx = db.transaction('restaurants');
                const restaurantStore = tx.objectStore('restaurants');           
                return restaurantStore.get(Number(id));
            }).then(function(restaurant_value) {
                callback(null,restaurant_value);
                console.log("Transaction success");
            }).catch(function() {
                console.log('Transaction failed');
            });
        } else {
            const dbPromise = DBHelper.openDatabase();
            let arrayRestaurants = [];
            dbPromise.then(function(db) {
                const tx = db.transaction('restaurants');
                const restaurantsStore = tx.objectStore('restaurants');           
                return restaurantsStore.openCursor();
            }).then(function createArrayRestaurants(cursor) {
                if(!cursor) return;
                arrayRestaurants.push(cursor.value);
                return cursor.continue().then(createArrayRestaurants);
            }).then(function() {
                callback(null,arrayRestaurants);
                console.log("Transaction success");
            }).catch(function() {
                console.log('Transaction failed');
            });
        }
    }
    
    /**
    * Static method used to load data of the Reviews from the browser database (IDB)
    */
    static getReviewsRestaurantValuesDatabase(restaurant_id,callback) {
        const dbPromise = DBHelper.openDatabase();
        let arrayReviews = [];
        dbPromise.then(function(db) {
            const tx = db.transaction('reviews');
            const reviewsStore = tx.objectStore('reviews');
            const reviewsRestaurantIndex = reviewsStore.index('restaurant_id');
            return reviewsRestaurantIndex.openCursor(Number(restaurant_id));
        }).then(function createArrayReviewsRestaurant(cursor) {
            if(!cursor) return;
            arrayReviews.push(cursor.value);
            return cursor.continue().then(createArrayReviewsRestaurant);
        }).then(function() {
            callback(null,arrayReviews);
            console.log("Transaction success");
        }).catch(function() {
            console.log('Transaction failed');
        });
    }

    /**
    * Fetch all restaurants.
    */
    static fetchRestaurants(callback) {
        fetch(DBHelper.RESTAURANTS_DATABASE_URL()).then(function(response) {
            if(response.ok) {
                //If the response status is 200 I'll take it
                return response.json();
            } else {
                //If the response status is different from 200 load the data from IDB
                DBHelper.getRestaurantsValuesDatabase(null, callback);
            }
        }).then(function(restaurants) {
            callback(null,restaurants);
        }).catch(function() {
            //If there is no line or there is a network error load the data from IDB
            DBHelper.getRestaurantsValuesDatabase(null, callback);
        });
    }
    
    /**
    * Fetch all reviews of one restaurant.
    */
    static fetchReviewsRestaurant(restaurant_id, callback) {
        fetch(DBHelper.REVIEWS_DATABASE_URL(restaurant_id)).then(function(response) {
            if(response.ok) {
                //If the response status is 200 I'll take it
                return response.json();
            } else {
                //If the response status is different from 200 load the data from IDB
                DBHelper.getReviewsRestaurantValuesDatabase(restaurant_id, callback);
            }
        }).then(function(reviews) {
            callback(null,reviews);
        }).catch(function() {
            //If there is no line or there is a network error load the data from IDB
            DBHelper.getReviewsRestaurantValuesDatabase(restaurant_id, callback);
        });
    }
   
    /**
    * Fetch a restaurant by its ID.
    */
    static fetchRestaurantById(id, callback) {
        fetch(DBHelper.RESTAURANTS_DATABASE_URL(id)).then(function(response) {
            if(response.ok) {
                //If the response status is 200 I'll take it
                return response.json();
            } else {
                //If the response status is different from 200 load the data from IDB
                DBHelper.getRestaurantsValuesDatabase(id, callback);
            }
        }).then(function(restaurant) {
            callback(null,restaurant);
        }).catch(function() {
            //If there is no line or there is a network error load the data from IDB
            DBHelper.getRestaurantsValuesDatabase(id, callback);
        });
    }
           
    /**
    * Fetch restaurants by a cuisine type with proper error handling.
    */
    static fetchRestaurantByCuisine(cuisine, callback) {
        // Fetch all restaurants  with proper error handling
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Filter restaurants to have only given cuisine type
                const results = restaurants.filter(r => r.cuisine_type == cuisine);
                callback(null, results);
            }
        });
    }

    /**
    * Fetch restaurants by a neighborhood with proper error handling.
    */
    static fetchRestaurantByNeighborhood(neighborhood, callback) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Filter restaurants to have only given neighborhood
                const results = restaurants.filter(r => r.neighborhood == neighborhood);
                callback(null, results);
            }
        });
    }

    /**
     * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
     */
    static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                let results = restaurants
                if (cuisine != 'all') { // filter by cuisine
                    results = results.filter(r => r.cuisine_type == cuisine);
                }
                if (neighborhood != 'all') { // filter by neighborhood
                    results = results.filter(r => r.neighborhood == neighborhood);
                }
                callback(null, results);
            }
        });
    }

    /**
     * Fetch all neighborhoods with proper error handling.
     */
    static fetchNeighborhoods(callback) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Get all neighborhoods from all restaurants
                const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
                // Remove duplicates from neighborhoods
                const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
                callback(null, uniqueNeighborhoods);
            }
        });
    }

    /**
     * Fetch all cuisines with proper error handling.
     */
    static fetchCuisines(callback) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Get all cuisines from all restaurants
                const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
                // Remove duplicates from cuisines
                const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
                callback(null, uniqueCuisines);
            }
        });
    }

    /**
     * Restaurant page URL.
     */
    static urlForRestaurant(restaurant) {
        return (`./restaurant.html?id=${restaurant.id}`);
    }

    /**
     * Restaurant image URL.
     */
    static imageUrlForRestaurant() {
        return (`./img/`);
    }

    /**
     * Map marker for a restaurant (index.html)
     */
    static mapMarkerForRestaurant(restaurant, map) {
        //Calc Media Review 
        //Info Restaurant
        const restaurant_info = restaurant.name+', Cuisine: '+restaurant.cuisine_type+', Today open: '+findRestaurantCurrentDayOpeningTimeHTML(restaurant.operating_hours);        
       
        const marker = new google.maps.Marker({
            position: restaurant.latlng,
            url: DBHelper.urlForRestaurant(restaurant),
            title: restaurant_info,
            map: map,
            animation: google.maps.Animation.DROP
        });
        return marker;
    }
    
    /**
     * Map marker for a restaurant (restaurant.html)
     */
    static mapMarkerForRestaurantInfo(restaurant, map) {
        
        const marker = new google.maps.Marker({
            position: restaurant.latlng,
            url: DBHelper.urlForRestaurant(restaurant),
            title: restaurant.name,
            map: map,
            animation: google.maps.Animation.DROP
        });
        return marker;
    }

}

//Add Restaurants to the database
DBHelper.putValuesRestaurantsDatabase();
