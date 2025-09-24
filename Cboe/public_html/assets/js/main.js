document.addEventListener('DOMContentLoaded', () => {
    const sliderWrapper = document.querySelector('.slider-wrapper');
    const images = document.querySelectorAll('.slider-wrapper img');
    const prevButton = document.querySelector('.prev-button');
    const nextButton = document.querySelector('.next-button');
    const paginationDotsContainer = document.querySelector('.pagination-dots');
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.getElementById('navLinks');
    const icon = hamburger.querySelector('i');

    // Onload Alert
    window.onload = () => {
        if (window.innerWidth <= 768) {
            const alertOverlay = document.getElementById('alertOverlay');
            alertOverlay.style.display = 'flex';

            // document.getElementById('closeAlertBtn').onclick = () => {
            //     alertBox.style.display = 'none';
            // }
        } else {
            const alertOverlay = document.getElementById('alertOverlay');
             alertBox.style.display = 'none';
        }
    };

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
    
    
    /* Counter */
function animateCounters() {
  const counters = document.querySelectorAll('.counter');
  counters.forEach(counter => {
    const target = +counter.getAttribute('data-target');
    const speed = 100; // smaller = faster

    const updateCount = () => {
      const current = +counter.innerText.replace(/,/g, '');
      const increment = Math.ceil(target / speed);

      if (current < target) {
        counter.innerText = (current + increment).toLocaleString();
        requestAnimationFrame(updateCount);
      } else {
        counter.innerText = target.toLocaleString();
      }
    };

    updateCount();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const countersSection = document.querySelector('.counters');
  if (countersSection) {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        animateCounters();
        observer.disconnect();
      }
    }, { threshold: 0 }); // trigger as soon as visible

    observer.observe(countersSection);
  }
});

    
    /* popups */
const popupQueue = [];
let isShowingPopup = false;

function queuePopup(message, type = "info") {
  popupQueue.push({ message, type });
  if (!isShowingPopup) {
    showNextPopup();
  }
}

function showNextPopup() {
  if (popupQueue.length === 0) {
    isShowingPopup = false;
    return;
  }

  isShowingPopup = true;
  const { message, type } = popupQueue.shift();

  const container = document.getElementById("popup-container");
  const popup = document.createElement("div");
  popup.className = `popup ${type}`;
  popup.textContent = message;

  container.appendChild(popup);

  // trigger animation
  setTimeout(() => popup.classList.add("show"), 50);

  // auto-remove after 4s and show next
  setTimeout(() => {
    popup.classList.remove("show");
    setTimeout(() => {
      popup.remove();
      showNextPopup();
    }, 800);
  }, 4000);
}

// === Fake random data ===
const names = [
  "Michael", "Sarah", "James", "Emma", "David", "Sophia", "Daniel",
  "Olivia", "Liam", "Mia", "Noah", "Ava", "Ethan", "Isabella",
  "Lucas", "Amelia", "Mason", "Charlotte", "Henry", "Grace"
];

function randomAmount(min = 20, max = 8000) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomTime() {
  const mins = Math.floor(Math.random() * 59) + 1; // 1–59 minutes
  const hours = Math.floor(Math.random() * 5) + 1; // 1–5 hours
  const days = Math.floor(Math.random() * 2) + 1;  // 1–2 days

  const rand = Math.random();
  if (rand < 0.6) return `${mins} mins ago`;
  if (rand < 0.9) return `${hours} hours ago`;
  return `${days} days ago`;
}

function randomMessage() {
  const name = names[Math.floor(Math.random() * names.length)];
  const amount = randomAmount();
  const time = randomTime();

  if (Math.random() < 0.5) {
    return { 
      text: `${name} withdrew $${amount} ${time}`, 
      type: "error" 
    };
  } else {
    return { 
      text: `${name} earned $${amount} ${time}`, 
      type: "success" 
    };
  }
}

// === Generate 100 popups ===
for (let i = 0; i < 100; i++) {
  const { text, type } = randomMessage();
  queuePopup(text, type);
}

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

    // Zoom In JS
    const zoomElements = document.querySelectorAll('.zoom-in');

    window.addEventListener('scroll', () => {
        zoomElements.forEach(zel => {
            const rect = zel.getBoundingClientRect();

            if (rect.top < window.innerHeight - 30 && rect.bottom > 0) {
                zel.classList.add('visible');
            } else {
                zel.classList.remove('visible');
            }
        });
    });
});