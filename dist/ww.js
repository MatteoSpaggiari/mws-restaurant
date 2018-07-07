self.addEventListener('message', function(e) {
    console.log('Message received from main script');
    const id_review = e.data.id;
    delete e.data.id;
    const message = JSON.stringify(e.data);
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
});