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
        let refreshing;
        navigator.serviceWorker.addEventListener('controllerchange', function() {
            if (refreshing) return;
            window.location.reload();
            refreshing = true;
        });
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
    
    static openDatabase() {
        // If the browser doesn't support service worker,
        // we don't care about having a database
        if (!navigator.serviceWorker) {
            return Promise.resolve();
        }

        return idb.open('restaurants-review', 1, function(upgradeDb) {
            let restaurantsStore;
            switch(upgradeDb.oldVersion) {
		case 0:
                    restaurantsStore = upgradeDb.createObjectStore('restaurants', {keyPath: 'id'});
            }
        });
    }
    
    putValuesDatabase() {
        fetch(DBHelper.DATABASE_URL).then(function(response) {
            if(response.ok) {
                return response.json();
            } else {
                const error = "Data not loaded";
                return error;
                
            }
        }).then(function(restaurants) {
            const dbPromise = OffLineFirst.openDatabase();
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
    
    static getValuesDatabase(callback) {
        const dbPromise = OffLineFirst.openDatabase();
        let arrayRestaurants = [];
        dbPromise.then(function(db) {
            const tx = db.transaction('restaurants');
            const restaurantsStore = tx.objectStore('restaurants');            
            return  restaurantsStore.openCursor();
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

const offLine = new OffLineFirst();
offLine.registerServiceWorker();
offLine.putValuesDatabase();