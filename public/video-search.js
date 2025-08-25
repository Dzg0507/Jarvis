document.addEventListener('DOMContentLoaded', () => {
    const videoList = document.getElementById('video-list');

    // Listen for custom event from the main script
    document.addEventListener('video-search-results', (event) => {
        const videos = event.detail;
        renderVideoResults(videos);
    });

    function renderVideoResults(videos) {
        videoList.innerHTML = ''; // Clear previous results

        if (videos.length === 0) {
            videoList.innerHTML = '<p>No videos found.</p>';
            return;
        }

        videos.forEach(video => {
            const videoElement = document.createElement('div');
            videoElement.classList.add('video-item');

            const thumbnail = document.createElement('img');
            thumbnail.src = video.thumbnail;
            thumbnail.alt = video.title;

            const title = document.createElement('h3');
            title.textContent = video.title;

            const link = document.createElement('a');
            link.href = video.url;
            link.target = '_blank'; // Open in new tab
            link.appendChild(thumbnail);
            link.appendChild(title);

            videoElement.appendChild(link);
            videoList.appendChild(videoElement);
        });
    }
});
