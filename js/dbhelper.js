/**
 * Common database helper functions.
 */
class DBHelper {
  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
    static get DATABASE_URL() {
        const port = 1337; // Change this to your server port
        return `http://localhost:${port}/restaurants`;
    }

  /**
   * Fetch all restaurants.
   */
    static fetchRestaurants(callback) {
        fetch(DBHelper.DATABASE_URL).then(function(response) {
            if(response.ok) {
                //If the response status is 200 I'll take it
                return response.json();
            } else {
                //If the response status is different from 200 load the data from IDB
                OffLineFirst.getValuesDatabase(callback);
            }
        }).then(function(restaurants) {
            callback(null,restaurants);
        }).catch(function() {
            //If there is no line or there is a network error load the data from IDB
            OffLineFirst.getValuesDatabase(callback);
        });
    }

  /**
   * Fetch a restaurant by its ID.
   */
    static fetchRestaurantById(id, callback) {
        // fetch all restaurants with proper error handling.
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                const restaurant = restaurants.find(r => r.id == id);
                if (restaurant) { // Got the restaurant
                    callback(null, restaurant);
                } else { // Restaurant does not exist in the database
                    callback('Restaurant does not exist', null);
                }
            }
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
    static imageUrlForRestaurant(restaurant) {
        return (`./img/`);
    }

    /**
     * Map marker for a restaurant (index.html)
     */
    static mapMarkerForRestaurant(restaurant, map) {
        //Calc Media Review 
        const media_review = calcMediaReviews(restaurant.reviews);
        //Info Restaurant
        const restaurant_info = restaurant.name+', Cuisine: '+restaurant.cuisine_type+''+(media_review != "" ? ', Media Review: '+media_review : '')+', Today open: '+findRestaurantCurrentDayOpeningTimeHTML(restaurant.operating_hours);        
       
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
