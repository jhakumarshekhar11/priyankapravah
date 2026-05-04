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

    // --- TACTILE RIPPLE EFFECT ---
    function createRipple(event) {
        const element = event.currentTarget;
        const circle = document.createElement("span");
        
        const diameter = Math.max(element.clientWidth, element.clientHeight);
        const radius = diameter / 2;

        const rect = element.getBoundingClientRect();
        
        // Support for both mouse clicks and mobile touches
        const clientX = event.clientX || (event.touches && event.touches[0].clientX);
        const clientY = event.clientY || (event.touches && event.touches[0].clientY);

        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${clientX - rect.left - radius}px`;
        circle.style.top = `${clientY - rect.top - radius}px`;
        circle.classList.add("ripple");

        // Remove any existing ripples to prevent lag on rapid taps
        const existingRipple = element.querySelector(".ripple");
        if (existingRipple) {
            existingRipple.remove();
        }

        element.appendChild(circle);
        
        // Clean up the DOM after the animation finishes
        setTimeout(() => circle.remove(), 600);
    }

    // Attach the ripple to all buttons, cards, and navigation links
    const interactiveElements = document.querySelectorAll('.cta-button, .library-card, .nav-links a');
    interactiveElements.forEach(el => {
        el.classList.add('ripple-parent');
        el.addEventListener('mousedown', createRipple); // Desktop
        el.addEventListener('touchstart', createRipple, { passive: true }); // Mobile
    });
    
});