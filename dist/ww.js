self.addEventListener('message', function(e) {
    console.log('Message received from main script');
    if(e.data[0] == "Review") {
        const id_review = e.data[1].id;
        delete e.data[1].id;
        const message = JSON.stringify(e.data[1]);
        console.log('Posting message back to main script');
        fetch('http://localhost:1337/reviews/',
        {
            method: "POST",
            "Accept-Charset": "utf-8",
            "Content-Type": "text/plain",
            body: message
        }).then(function(response) {
            if(response.ok) {
                return response.json();
            } else {
                const error = "No added review";
                self.postMessage(error);
            }
        }).then(function(data) {
            self.postMessage(id_review);
        }).catch(function() {
            const error = "No added review";
            self.postMessage(error);
        });
    } else if(e.data[0] == "Favorite Restaurant") {
        console.log('Posting message back to main script');
        const id_restaurant = e.data[1].id;
        fetch('http://localhost:1337/restaurants/'+e.data[1].id+'/?is_favorite='+e.data[1].is_favorite,
        {
            method: "PUT",
            "Accept-Charset": "utf-8",
            "Content-Type": "text/plain"
        }).then(function(response) {
            if(response.ok) {
                return response.json();
            } else {
                const error = "No added favorite restaurant";
                self.postMessage(error);
            }
        }).then(function(data) {
            self.postMessage(id_restaurant);
        }).catch(function() {
            const error = "No added favorite restaurant";
            self.postMessage(error);
        });
    }
});