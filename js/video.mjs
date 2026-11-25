import { $ } from './shared.mjs';

const playBtn = $('#play-btn');
const video = $('#lifestyle-thumb');
const wrap = $('#video-wrap');

function hidePlay() {
  playBtn?.classList.remove('is-visible');
}

function showPlay() {
  playBtn?.classList.add('is-visible');
}

function playVideo() {
  if (!video) return;

  hidePlay();
  video.muted = false;
  video.controls = false;
  video.play().catch(() => {
    video.muted = true;
    video.play();
  });
}

export function initVideo() {
  if (!video) return;

  video.addEventListener('playing', hidePlay);
  video.play().then(hidePlay).catch(showPlay);

  playBtn?.addEventListener('click', playVideo);
  wrap?.addEventListener('click', (e) => {
    if (playBtn?.contains(e.target)) playVideo();
  });
}
