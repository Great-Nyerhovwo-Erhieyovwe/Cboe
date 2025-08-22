document.addEventListener('DOMContentLoaded', () => {
    const sliderWrapper = document.querySelector('.slider-wrapper');
    const images = document.querySelectorAll('.slider-wrapper img');
    const prevButton = document.querySelector('.prev-button');
    const nextButton = document.querySelector('.next-button');
    const paginationDotsContainer = document.querySelector('.pagination-dots');
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.getElementById('navLinks');
    const icon = hamburger.querySelector('i');

    /* Hamburger */
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('active');

        // toggle icon class between bars and xmark
        if (icon.classList.contains('fa-bars')) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-xmark');
        } else {
            icon.classList.remove('fa-xmark');
            icon.classList.add('fa-bars');
        }


        // accessibility
        const expanded = hamburger.getAttribute("aria-expanded") === "true";
        hamburger.setAttribute("aria-expanded", !expanded);
    });

    // Close nav when a links is clicked
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            icon.classList.add('fa-bars');
            icon.classList.remove('fa-xmark');
            hamburger.setAttribute("aria-expanded", false);
        });
    });

    /* back to top */
    const backToTopBtn = document.getElementById('backToTop');

    // Show or hide button based on scroll position
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTopBtn.classList.add('show');
        } else {
            backToTopBtn.classList.remove('show');
        }
    });

    // smooth scroll to top when button is clicked
    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    let currentIndex = 0;
    const totalImages = images.length;
    let autoPlayInterval;
    const autoPlayDelay = 3000;

    // update the slider's position
    const updateSliderPosition = () => {
        /* 
        calculate how much to move the slider-wrapper horizontally
        Each images takes 100% width, so we move by multiples of 100%
        */

        const offset = -currentIndex * 100;
        sliderWrapper.style.transform = `translateX(${offset}%)`;

        // you still have to update the active dots
        updatePaginationDots();
    };

    // pagination dots logic
    const createPaginationDots = () => {
        for (let i = 0; i < totalImages; i++) {
            const dot = document.createElement('span');
            dot.classList.add('dot');
            dot.dataset.index = i;
            paginationDotsContainer.appendChild(dot);

            dot.addEventListener('click', () => {
                currentIndex = i; // set current index to the clicked dot's index
                updateSliderPosition();
                resetAutoPlay(); // reset auto-play or manual interaction
            });
        }
        updatePaginationDots(); // set initial active dot
    };

    const updatePaginationDots = () => {
        const dots = document.querySelectorAll('.dot');
        dots.forEach((dot, index) => {
            if (index === currentIndex) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    };

    // Navigation Logic
    const showNextImage = () => {
        currentIndex = (currentIndex + 1) % totalImages; // Cycle through images
        updateSliderPosition();
        resetAutoPlay();
    };

    const showPrevImage = () => {
        currentIndex = (currentIndex - 1 + totalImages) % totalImages; // cycle back 
        updateSliderPosition();
        resetAutoPlay();
    };

    // Auto-Play Logic
    const startAutoPlay = () => {
        // Clear any existing to prevent multiple timers running
        clearInterval(autoPlayInterval);
        autoPlayInterval = setInterval(showNextImage, autoPlayDelay);
    };

    const stopAutoPlay = () => {
        clearInterval(autoPlayInterval);
    };

    const resetAutoPlay = () => {
        stopAutoPlay();
        startAutoPlay();
    };

    nextButton.addEventListener('click', showNextImage);
    prevButton.addEventListener('click', showPrevImage);

    // stop auto play on hover 
    sliderWrapper.addEventListener('mouseenter', stopAutoPlay);
    sliderWrapper.addEventListener('mouseleave', startAutoPlay);

    // intialization
    createPaginationDots(); // create dots based on number of images
    updateSliderPosition(); // set initial position (should be 0%)
    startAutoPlay();
});