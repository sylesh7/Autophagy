
document.addEventListener("DOMContentLoaded", function() {
    const nav = document.querySelector('.nav_inner');
    const dropdownToggle = document.querySelector('.w-dropdown-toggle');
    const scrollThreshold = 0.01;

    // Set your transition duration here
    const transitionTime = '0.3s';

    function checkScroll() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrollPercent = scrollTop / docHeight;

        if (scrollPercent > scrollThreshold && !dropdownToggle.classList.contains('w--open')) {
            nav.style.transition = `all ${transitionTime} ease`;
            nav.classList.add('is-scroll');
        } else {
            nav.classList.remove('is-scroll');
        }
    }

    window.addEventListener('scroll', checkScroll);

    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.attributeName === "class") {
                const isOpen = dropdownToggle.classList.contains('w--open');
                
                if (isOpen) {
                    // Set transition to 0s for instant removal
                    nav.style.transition = '0s';
                    nav.classList.remove('is-scroll');
                } else {
                    // Re-apply transition and check scroll position
                    nav.style.transition = `all ${transitionTime} ease`;
                    checkScroll();
                }
            }
        });
    });

    observer.observe(dropdownToggle, { attributes: true });
});
