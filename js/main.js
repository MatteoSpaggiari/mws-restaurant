let restaurants, neighborhoods, cuisines;
var map;
var markers = [];

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
    fetchNeighborhoods();
    fetchCuisines();
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
    DBHelper.fetchNeighborhoods((error, neighborhoods) => {
        if (error) { // Got an error
            console.error(error);
        } else {
            self.neighborhoods = neighborhoods;
            fillNeighborhoodsHTML();
        }
    });
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
    const select = document.getElementById('neighborhoods-select');
    neighborhoods.forEach(neighborhood => {
        const option = document.createElement('option');
        option.innerHTML = neighborhood;
        option.value = neighborhood;
        select.append(option);
    });
    
    
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
    DBHelper.fetchCuisines((error, cuisines) => {
        if (error) { // Got an error!
            console.error(error);
        } else {
            self.cuisines = cuisines;
            fillCuisinesHTML();
        }
    });
}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
    const select = document.getElementById('cuisines-select');

    cuisines.forEach(cuisine => {
        const option = document.createElement('option');
        option.innerHTML = cuisine;
        option.value = cuisine;
        select.append(option);
    });
}

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
    let loc = {
        lat: 40.722216,
        lng: -73.987501
    };
    self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 12,
        center: loc,
        scrollwheel: false
    });
    updateRestaurants();
}

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
    const cSelect = document.getElementById('cuisines-select');
    const nSelect = document.getElementById('neighborhoods-select');

    const cIndex = cSelect.selectedIndex;
    const nIndex = nSelect.selectedIndex;

    const cuisine = cSelect[cIndex].value;
    const neighborhood = nSelect[nIndex].value;

    DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
        if (error) { // Got an error!
            console.error(error);
        } else {
            resetRestaurants(restaurants);
            fillRestaurantsHTML();
        }
    });
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
    // Remove all restaurants
    self.restaurants = [];
    const ul = document.getElementById('restaurants-list');
    ul.innerHTML = '';

    // Remove all map markers
    self.markers.forEach(m => m.setMap(null));
    self.markers = [];
    self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
    const ul = document.getElementById('restaurants-list');
    restaurants.forEach(restaurant => {
        ul.append(createRestaurantHTML(restaurant));
    });
    addMarkersToMap();
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
    const li = document.createElement('li');
    
    const cont_rest = document.createElement('article');
    cont_rest.className = 'cont-restaurant';
    li.append(cont_rest);
    
    const picture = document.createElement('picture');
    const source = document.createElement('source');
    source.srcset = `${DBHelper.imageUrlForRestaurant(restaurant)}${restaurant.photograph_1x} 1x, ${DBHelper.imageUrlForRestaurant(restaurant)}${restaurant.photograph_2x} 2x`;
    picture.append(source);
    const image = document.createElement('img');
    image.className = 'restaurant-img';
    image.src = `${DBHelper.imageUrlForRestaurant(restaurant)}${restaurant.photograph_maxw}`;
    image.alt = restaurant.description_image;    
    picture.append(image);
    cont_rest.append(picture);

    const name = document.createElement('h1');
    name.innerHTML = restaurant.name;
    cont_rest.append(name);
    
    const div = document.createElement('div');
    div.className = 'restaurant-info';
    cont_rest.append(div);

    const neighborhood = document.createElement('p');
    neighborhood.innerHTML = restaurant.neighborhood;
    div.append(neighborhood);

    const address = document.createElement('p');
    address.innerHTML = restaurant.address;
    div.append(address);

    const cont_more = document.createElement('p');
    cont_more.className = 'cont-more';
    const more = document.createElement('a');
    more.className = 'button';
    more.innerHTML = 'View Details';
    more.setAttribute("aria-label","Name: "+restaurant.name+"; Neighborhood: "+restaurant.neighborhood);
    more.href = DBHelper.urlForRestaurant(restaurant);
    cont_more.append(more)
    cont_rest.append(cont_more)

    return li;
}

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
    restaurants.forEach(restaurant => {
        // Add marker to the map
        const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
        google.maps.event.addListener(marker, 'click', () => {
            window.location.href = marker.url
        });
        google.maps.event.addListener(marker, 'focus', () => {
            alert("ciao");
            window.location.href = marker.url
        });
        self.markers.push(marker);
    });
}

/**
 * Add event 'change' on the select of the filter
 */
const neighborhoods_select = document.getElementById('neighborhoods-select');
neighborhoods_select.addEventListener("change",function(){updateRestaurants();});
const cuisines_select = document.getElementById('cuisines-select');
cuisines_select.addEventListener("change",function(){updateRestaurants();});

/**
 * Make the restaurant information visible only when there is a focus on the link "view details"
 */
window.addEventListener("keydown", function(event) {
    const windowWidth = window.innerWidth;
    if(windowWidth < 1060) {
        const key = event.charCode || event.keyCode;
        if(key === 9) //Only when the key pressed is tab
        {
            const buttons = document.getElementsByClassName("button");
            for(let i = 0; i < buttons.length;i++)
            {
                buttons[i].addEventListener("focus",function(event)
                {
                    buttons[i].parentElement.previousSibling.classList.add("visible");
                });
                buttons[i].addEventListener("blur",function(event)
                {
                    buttons[i].parentElement.previousSibling.classList.remove("visible");
                });
            }
        }
    }
});

/**
 * For those who use the keyboard to navigate, they can skip to the main content "Filter and Restaurant Tabs"
 */
const skip_link = document.getElementById("skip-link");
const restaurant_focus = document.getElementById("restaurants");
skip_link.addEventListener("keydown",function(event){
    event.preventDefault();
    const key = event.charCode || event.keyCode;
    if(key === 32 || key === 13) {
        restaurant_focus.focus();
    }
});