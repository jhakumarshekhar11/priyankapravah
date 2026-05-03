// script.js
document.addEventListener("DOMContentLoaded", () => {
    // 1. Reveal on Scroll Logic
    const reveals = document.querySelectorAll('.reveal');

    const revealOptions = {
        threshold: 0.15, // Triggers when 15% of the element is visible
        rootMargin: "0px 0px -50px 0px" 
    };

    const revealOnScroll = new IntersectionObserver(function(entries, observer) {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('active');
            // Optional: Stop observing once revealed to keep it visible
            observer.unobserve(entry.target);
        });
    }, revealOptions);

    reveals.forEach(reveal => {
        revealOnScroll.observe(reveal);
    });

    // --- Hero Background Slider Logic ---
    const slides = document.querySelectorAll('.hero-slider .slide');
    let currentSlide = 0;
    const slideInterval = 3000; // 3000 milliseconds = 3 seconds

    if (slides.length > 0) {
        // Run this code continuously every 3 seconds
        setInterval(() => {
            // Remove 'active' from the current slide
            slides[currentSlide].classList.remove('active');
            
            // Move to the next slide (and loop back to 0 if at the end)
            currentSlide = (currentSlide + 1) % slides.length;
            
            // Add 'active' to the new slide
            slides[currentSlide].classList.add('active');
        }, slideInterval);
    }
});