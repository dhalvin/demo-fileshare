window.addEventListener("DOMContentLoaded", function(){
    gsap.from(".risein", {duration: 2, opacity: 0, y: "+200", stagger: 0.2});
    gsap.from(".rightin", {duration: 2, opacity: 0, x: "+200", stagger: 0.2});
});