if(location.pathname.indexOf("restaurant.html") !== -1) {
    let restaurant;
    var map;

    /**
     * Initialize Google map, called from HTML.
     */
    window.initMap = () => {
        fetchRestaurantFromURL((error, restaurant) => {
          if (error) { // Got an error!
                console.error(error);
          } else {
                self.map = new google.maps.Map(document.getElementById('map'), {
                    zoom: 16,
                    center: restaurant.latlng,
                    scrollwheel: false
                });
                fillBreadcrumb();
                DBHelper.mapMarkerForRestaurantInfo(self.restaurant, self.map);
          }
        });
    };

    /**
     * Get current restaurant from page URL.
     */
    fetchRestaurantFromURL = (callback) => {
        if (self.restaurant) { // restaurant already fetched!
            callback(null, self.restaurant)
            return;
        }
        const id = getParameterByName('id');
        if (!id) { // no id found in URL
            error = 'No restaurant id in URL';
            callback(error, null);
        } else {
            DBHelper.fetchRestaurantById(id, (error, restaurant) => {
                self.restaurant = restaurant;
                if (!restaurant) {
                    console.error(error);
                    return;
                }
                fillRestaurantHTML();
                callback(null, restaurant);
            });
        }
    };

    /**
     * Create restaurant HTML and add it to the webpage
     */
    fillRestaurantHTML = (restaurant = self.restaurant) => {

        const name = document.getElementById('restaurant-name');
        name.innerHTML = restaurant.name;

        //Modify the title tag of the page by adding the restaurant name
        const title = document.title;
        document.title = `${title} - ${restaurant.name}`;

        const address = document.getElementById('restaurant-address');
        address.innerHTML = restaurant.address;
        address.setAttribute("aria-label","Address: "+restaurant.address);

        const image = document.getElementById('restaurant-img');
        image.className = 'restaurant-img';
        image.alt = `Image of ${restaurant.name}`;
        image.src = `${DBHelper.imageUrlForRestaurant(restaurant)}${restaurant.photograph_maxw}`;

        const cuisine = document.getElementById('restaurant-cuisine');
        cuisine.innerHTML = restaurant.cuisine_type;
        cuisine.setAttribute("aria-label","Cuisine: "+restaurant.cuisine_type);

        // fill operating hours
        if (restaurant.operating_hours) {
          fillRestaurantHoursHTML();
        }

        // fill Media Reviews
        const mediaReviews = document.getElementById('media-reviews');
        mediaReviews.innerHTML = "<em>Media reviews: "+calcMediaReviews()+"</em>";
        mediaReviews.setAttribute("aria-label","Media reviews: "+calcMediaReviews());


        // fill reviews
        fillReviewsHTML();

        // fill Summary Opening Times
        fillRestaurantHoursSummaryHTML();

    };

    /**
     * Create restaurant operating hours HTML table and add it to the webpage.
     */
    fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
        const hours = document.getElementById('restaurant-hours');
        let i = 0;
        for (let key in operatingHours) {
            const row = document.createElement('tr');
            if(i % 2 !== 0) {
                row.className = "odd";
            } else {
                row.className = "even";
            }
            const day = document.createElement('td');
            day.innerHTML = key;
            row.appendChild(day);

            const time = document.createElement('td');
            time.innerHTML = operatingHours[key];
            row.appendChild(time);

            hours.appendChild(row);
            i++;
        }
    };

    /**
     * Create restaurant summary opening times
     */
    fillRestaurantHoursSummaryHTML = (operatingHours = self.restaurant.operating_hours) => {
        const hours_summary = document.getElementById('hours-summary');
        const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        let string = "Opening time: ";
        let i = 0;
        for (let key in operatingHours) {
            if(i == 0) {
                string += days[i];
                if(operatingHours[days[i+1]] != operatingHours[days[i]]) {
                    string += " "+operatingHours[days[i]]; 
                }
            } else {
                if(operatingHours[days[i]] == operatingHours[days[i-1]]) {
                    string += ", "+days[i];
                    if(operatingHours[days[i+1]] != operatingHours[days[i]]) {
                        string += " "+operatingHours[days[i]]; 
                    }
                } else {
                    string += "; "+days[i];
                    if(operatingHours[days[i+1]] != operatingHours[days[i]]) {
                        string += " "+operatingHours[days[i]]; 
                    }
                }
            }
            i++;
        }
        hours_summary.innerHTML = string;
    };

    /**
     * Create all reviews HTML and add them to the webpage.
     */
    fillReviewsHTML = (reviews = self.restaurant.reviews) => {
        const container = document.getElementById('reviews-container');
        const title = document.createElement('h2');
        title.innerHTML = 'Reviews';
        container.appendChild(title);

        if (!reviews) {
            const noReviews = document.createElement('p');
            noReviews.innerHTML = 'No reviews yet!';
            container.appendChild(noReviews);
            return;
        }
        const ul = document.getElementById('reviews-list');
        reviews.forEach(review => {
            ul.appendChild(createReviewHTML(review));
        });
        container.appendChild(ul);
    };

    /**
     * Create review HTML and add it to the webpage.
     */
    createReviewHTML = (review) => {
        const li = document.createElement('li');
        const article = document.createElement('article');
        article.className = "cont-review";
        li.appendChild(article);

        const header = document.createElement('header');
        article.appendChild(header);

        const name = document.createElement('h3');
        name.className = "name-review";
        name.innerHTML = review.name;
        header.appendChild(name);

        const date = document.createElement('p');
        date.className = "date-review";
        date.innerHTML = review.date;
        header.appendChild(date);

        const div_cont = document.createElement('div');
        div_cont.className = "body-review";
        article.appendChild(div_cont);

        const rating = document.createElement('p');
        rating.className = "rating-review";
        rating.innerHTML = `Rating: ${review.rating}`;
        div_cont.appendChild(rating);

        const comments = document.createElement('p');
        comments.className = "comment-review";
        comments.innerHTML = review.comments;
        div_cont.appendChild(comments);

        return li;
    };

    /**
     * Average calculation reviews
     */
    calcMediaReviews = (reviews = self.restaurant.reviews) => {
        if(reviews) {
            let i;
            let sum = 0;
            let media = 0;
            let num_reviews = reviews.length;
            for(i = 0; i < num_reviews; i++) {
                sum = sum + reviews[i].rating;
            }
            media = sum / num_reviews;
            media = media > 0 ? media.toFixed(2) : "No reviews available";
            return media;
        }
        return "No reviews available";
    };

    /**
     * Add restaurant name to the breadcrumb navigation menu
     */
    fillBreadcrumb = (restaurant=self.restaurant) => {
        const breadcrumb = document.getElementById('breadcrumb');
        const li = document.createElement('li');
        li.innerHTML = restaurant.name;
        breadcrumb.appendChild(li);
    };

    /**
     * Get a parameter by name from page URL.
     */
    getParameterByName = (name, url) => {
        if (!url)
            url = window.location.href;
        name = name.replace(/[\[\]]/g, '\\$&');
        const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
            results = regex.exec(url);
        if (!results)
            return null;
        if (!results[2])
            return '';
        return decodeURIComponent(results[2].replace(/\+/g, ' '));
    };

    /**
     * For those who use the keyboard to navigate, they can skip to the main content "Restaurant Info"
     */
    const skip_link_restaurant_info = document.getElementById("skip-link-restaurant-info");
    if(skip_link_restaurant_info !== null) {
        const restaurant_focus_restaurant_info = document.getElementById("restaurant-container");
        skip_link_restaurant_info.addEventListener("keydown",function(event){
            const key = event.charCode || event.keyCode;
            if(key === 32 || key === 13) {
                restaurant_focus.focus();
            }
        });
    }
}