const SIZES = [.83, .69, .96, .77];
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

function position(time, index, compact) {
  const pair = index >> 1, follower = index % 2;
  const t = time - follower * 4.2, direction = pair ? -1 : 1;
  const rate = pair ? .022 : .024, pulse = pair ? .073 : .087, phase = pair * 1.9;
  // A shared, varying pace lets the second fish follow a turn a little later.
  const angle = (pair ? .45 : -.85) + direction * rate *
    (t + .14 / pulse * (Math.cos(phase) - Math.cos(t * pulse + phase)));
  const span = compact ? (pair ? 400 : 380) : (pair ? 1000 : 1080);
  const depth = compact ? (pair ? 42 : 28) : (pair ? 60 : 40);
  const channel = pair ? (compact ? 430 : 760) : (compact ? -195 : -196);
  const height = (compact ? (pair ? 435 : 461) : (pair ? 474 : 526)) - follower * 38;
  const interior = Math.cos(angle) ** 2;
  return [
    Math.sin(angle) * span,
    channel + Math.cos(angle) * depth + interior * Math.sin(t * .12 + index * 1.3) * 7,
    height + Math.sin(t * .17 + pair * 2.1) * 4 + Math.sin(t * .09 + index) * 2,
  ];
}

/** Two loose pairs, with no accumulated simulation state or resize resets. */
export function fishPose(time, index, compact = false) {
  const step = .04, centre = position(time, index, compact);
  const before = position(time - step, index, compact), after = position(time + step, index, compact);
  const velocity = after.map((value, axis) => (value - before[axis]) / (step * 2));
  const acceleration = after.map((value, axis) => (value - 2 * centre[axis] + before[axis]) / (step * step));
  const speed = Math.hypot(velocity[0], velocity[1]);
  const turn = (velocity[0] * acceleration[1] - velocity[1] * acceleration[0]) / (speed * speed);
  return {
    centre,
    yaw: Math.atan2(velocity[1], velocity[0]),
    pitch: clamp(Math.atan2(velocity[2], speed), -.085, .085),
    bank: .10 * Math.tanh(turn * .7),
    size: SIZES[index],
  };
}
