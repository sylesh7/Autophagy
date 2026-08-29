
document.addEventListener("DOMContentLoaded", function() {
    const nav = document.querySelector('.nav_inner');
    const scrollThreshold = 0.01; // 1%

    function checkScroll() {
        // Calculate scroll percentage
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrollPercent = scrollTop / docHeight;

        if (scrollPercent > scrollThreshold) {
            nav.classList.add('is-scroll');
        } else {
            nav.classList.remove('is-scroll');
        }
    }

    // Check on scroll
    window.addEventListener('scroll', checkScroll);
    
    // Check on initial load/refresh
    checkScroll();
});
