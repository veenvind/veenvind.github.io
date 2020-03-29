export default function daysSince(from, to=Date.now()){
  const diff = to - from;
  const secs= diff/1000;
  const mins= secs/60;
  const hours = mins/60;
  const days = hours/24;
  const weeks = days/7;

  return { secs, mins, hours, days, weeks };
};
