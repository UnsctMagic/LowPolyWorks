export function startToolPings(root) {
  const pings = [...root.querySelectorAll('[data-tool-ping]')];
  let started;
  function draw(now) {
    if (!root.isConnected) return;
    started ??= now;
    const age = (now - started) % 1600, radius = 27 + 5 * Math.sin(age / 75);
    let path = 'M ' + (48 + radius) + ' 48 a ' + radius + ' ' + radius + ' 0 1 0 ' + (-2 * radius) + ' 0 a ' + radius + ' ' + radius + ' 0 1 0 ' + (2 * radius) + ' 0';
    for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) path += ' M ' + (48 + dx * (radius - 7)) + ' ' + (48 + dy * (radius - 7)) + ' L ' + (48 + dx * (radius + 11)) + ' ' + (48 + dy * (radius + 11));
    for (const ping of pings) {
      ping.style.opacity = Math.max(0, Math.min(1, (1200 - age) / 200));
      for (const stroke of ping.querySelectorAll('path')) stroke.setAttribute('d', path);
    }
    requestAnimationFrame(draw);
  }
  if (pings.length) requestAnimationFrame(draw);
}
