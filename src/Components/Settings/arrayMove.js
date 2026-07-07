export function arrayMove(arr, from, to) {
  const copy = arr.slice();
  copy.splice(to, 0, copy.splice(from, 1)[0]);
  return copy;
}
