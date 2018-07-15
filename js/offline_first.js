/**
 * Service Worker
 */
class OffLineFirst {
    registerServiceWorker() {
        if (!navigator.serviceWorker) return;

        const offLineFirst = this;
        navigator.serviceWorker.register('sw.js').then(function(reg) {
            if (!navigator.serviceWorker.controller) {
              return;
            }

            if (reg.waiting) {
                offLineFirst.updateReady(reg.waiting);
              return;
            }

            if (reg.installing) {
                offLineFirst.trackInstalling(reg.installing);
              return;
            }

            reg.addEventListener('updatefound', function() {
                offLineFirst.trackInstalling(reg.installing);
            });
        });

        // Ensure refresh is only called once.
        // This works around a bug in "force update on reload".
        /*
        let refreshing;
        navigator.serviceWorker.addEventListener('controllerchange', function() {
            if (refreshing) return;
            window.location.reload();
            refreshing = true;
        });
        */
    }

    trackInstalling(worker) {
        const offLineFirst = this;
        worker.addEventListener('statechange', function() {
            if (worker.state == 'installed') {
              offLineFirst.updateReady(worker);
            }
        });
    }

    updateReady(worker) {
        const div = document.createElement('div');
        div.id = "service-worker";
        div.className = "service-worker";

        const refresh = document.createElement('button');
        refresh.id = "refresh";
        refresh.type = "button";
        refresh.className = "button-sw";
        refresh.innerHTML = "refresh";
        div.append(refresh);

        const dismiss = document.createElement('button');
        dismiss.id = "dismiss";
        dismiss.type = "button";
        dismiss.className = "button-sw";
        dismiss.innerHTML = "dismiss";
        div.append(dismiss);

        document.body.append(div);

        refresh.addEventListener("click",function(event) {
            worker.postMessage({action: 'skipWaiting'});
        });

        dismiss.addEventListener("click",function(event){
            div.style.display = "none";
        });
    };
    
    /**
    * Static method used to load data of the Reviews Offline from the browser database (IDB)
    */
    static getReviewsRestaurantsOfflineValuesDatabase(callback) {
        const dbPromise = DBHelper.openDatabase();
        let arrayReviewsOffline = [];
        dbPromise.then(function(db) {
            const tx = db.transaction('reviews-offline');
            const reviewsOfflineStore = tx.objectStore('reviews-offline');
            return reviewsOfflineStore.openCursor();
        }).then(function createArrayReviewsRestaurant(cursor) {
            if(!cursor) return;
            arrayReviewsOffline.push(cursor.value);
            return cursor.continue().then(createArrayReviewsRestaurant);
        }).then(function() {
            callback(null,arrayReviewsOffline);
            console.log("Transaction success");
        }).catch(function() {
            console.log('Transaction failed');
        });
    }
    
    /**
    * Static method used to delete data of the Reviews Offline from the browser database (IDB)
    */
    static deleteReviewsRestaurantsOfflineValuesDatabase(id_review) {
        const dbPromise = DBHelper.openDatabase();
        dbPromise.then(function(db) {
            const tx = db.transaction('reviews-offline','readwrite');
            const reviewsOfflineStore = tx.objectStore('reviews-offline');
            return reviewsOfflineStore.delete(id_review);
        }).then(function() {
            console.log("Review deleted");
        }).catch(function() {
            console.log('Transaction failed');
        });
    }
    
    /**
    * Static method used to load data of the Favorites Restaurants Offline from the browser database (IDB)
    */
    static getFavoritesRestaurantsOfflineValuesDatabase(callback) {
        const dbPromise = DBHelper.openDatabase();
        let arrayFavoritesOffline = [];
        dbPromise.then(function(db) {
            const tx = db.transaction('favorites-restaurants-offline');
            const favoritesRestaurantsOfflineStore = tx.objectStore('favorites-restaurants-offline');
            return favoritesRestaurantsOfflineStore.openCursor();
        }).then(function createArrayFavoritesRestaurants(cursor) {
            if(!cursor) return;
            arrayFavoritesOffline.push(cursor.value);
            return cursor.continue().then(createArrayFavoritesRestaurants);
        }).then(function() {
            callback(null,arrayFavoritesOffline);
            console.log("Transaction success");
        }).catch(function() {
            console.log('Transaction failed');
        });
    }
    
    /**
    * Static method used to delete data of the Favorites Restaurants Offline from the browser database (IDB)
    */
    static deleteFavoritesRestaurantsOfflineValuesDatabase(id_restaurant) {
        const dbPromise = DBHelper.openDatabase();
        dbPromise.then(function(db) {
            const tx = db.transaction('favorites-restaurants-offline','readwrite');
            const favoritesRestaurantsOfflineStore = tx.objectStore('favorites-restaurants-offline');
            return favoritesRestaurantsOfflineStore.delete(id_restaurant);
        }).then(function() {
            console.log("Favorites Restaurants deleted");
        }).catch(function() {
            console.log('Transaction failed');
        });
    }
}

const offLine = new OffLineFirst();
offLine.registerServiceWorker();

//Send the saved reviews as soon as there is a connection
if (window.Worker) { // Check if Browser supports the Worker api.
    // Requires script name as input
    const myWorker = new Worker("../ww.js");

    let areReviewsOffline = false;
    let areFavoritesRestaurantsOffline = false;

    function addReviewsOffline() {
        OffLineFirst.getReviewsRestaurantsOfflineValuesDatabase(function(error,reviews){
            if(error) {
                console.log(error);
            } else {
                if(reviews.length == 0) {
                    if(areReviewsOffline) {
                        const advise = "Connection restored, Reviews offline added thanks";
                        DBHelper.openAdviseUser(advise,"hide");
                    }
                    clearInterval(idIntervalReviews);
                } else {
                    areReviewsOffline = true;
                }
                let id_review;
                reviews.forEach(function(review) {
                    myWorker.postMessage(["Review",review]);
                    console.log('Message posted to worker');
                    myWorker.addEventListener('message', function(e) {
                        if(e.data >= 0) {
                            OffLineFirst.deleteReviewsRestaurantsOfflineValuesDatabase(e.data);
                            console.log('Message received from worker: Added review');
                        } else {
                            console.log(e.data);
                        }
                    });
                });
            }
        });
    }
    const idIntervalReviews = setInterval(addReviewsOffline, 5000);

    function addFavoritesRestaurantsOffline() {
        OffLineFirst.getFavoritesRestaurantsOfflineValuesDatabase(function(error,favoritesRestaurants){
            if(error) {
                console.log(error);
            } else {
                if(favoritesRestaurants.length == 0) {
                    if(areFavoritesRestaurantsOffline) {
                        const advise = "Connection restored, Favorites Restaurants offline added thanks";
                        DBHelper.openAdviseUser(advise,"hide");
                    }
                    clearInterval(idIntervalFavoritesRestaurants);
                } else {
                    areFavoritesRestaurantsOffline = true;
                }
                let id_restaurant;
                favoritesRestaurants.forEach(function(favoriteRestaurant) {
                    console.log(favoriteRestaurant);
                    myWorker.postMessage(["Favorite Restaurant",favoriteRestaurant]);
                    console.log('Message posted to worker');
                    myWorker.addEventListener('message', function(e) {
                        if(e.data >= 0) {
                            OffLineFirst.deleteFavoritesRestaurantsOfflineValuesDatabase(e.data);
                            console.log('Message received from worker: Added favorites restaurants');
                        } else {
                            console.log(e.data);
                        }
                    });
                });
            }
        });
    }
    const idIntervalFavoritesRestaurants = setInterval(addFavoritesRestaurantsOffline, 5000);
}


