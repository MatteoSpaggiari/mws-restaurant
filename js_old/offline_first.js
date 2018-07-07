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
}

const offLine = new OffLineFirst();
offLine.registerServiceWorker();