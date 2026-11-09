export function mountTutorialPlayers(article, animations, resolveAsset = url => url) {
  const videos = [...article.querySelectorAll('video[data-tutorial-video]')];
  const autoplay = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stop = () => {
    observer.disconnect();
    for (const video of videos) video.pause();
  };
  const observer = new IntersectionObserver(entries => {
    if (!article.isConnected) {
      stop();
      return;
    }
    for (const {target: video, isIntersecting, intersectionRatio} of entries) {
      if (!isIntersecting || intersectionRatio < .25) {
        video.pause();
        continue;
      }
      if (!video.hasAttribute('src')) video.src = resolveAsset(video.dataset.tutorialVideo);
      if (autoplay) video.play().catch(() => {});
    }
  }, {threshold: [.25]});
  for (const video of videos) {
    if (video.dataset.poster) video.poster = resolveAsset(video.dataset.poster);
    const recording = animations[video.closest('[data-animation]')?.dataset.animation];
    if (recording?.cues.length && !video.textTracks.length) {
      const starts = [0];
      for (const duration of recording.durations) starts.push(starts.at(-1) + duration);
      const first = recording.cues[0];
      const continuous = recording.cues.at(-1).endFrame === recording.durations.length
        && recording.cues.every((cue, index) => index === 0 || recording.cues[index - 1].endFrame === cue.startFrame);
      const track = video.addTextTrack('subtitles', 'Keyboard cues');
      for (const {startFrame, endFrame, key} of recording.cues) {
        const start = continuous && startFrame === first.startFrame ? 0 : starts[startFrame];
        const cue = new VTTCue(start / 1000, starts[endFrame] / 1000, key);
        cue.snapToLines = false;
        cue.line = matchMedia('(max-width: 650px)').matches ? 63 : 78;
        cue.position = 1;
        cue.positionAlign = 'line-left';
        cue.align = 'start';
        track.addCue(cue);
      }
      track.mode = 'showing';
    }
    observer.observe(video);
  }
  return stop;
}
