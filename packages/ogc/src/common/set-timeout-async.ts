export default function setTimeoutAsync(
  seconds: number,
  callback: () => any
): Promise<any> {
  // how do I error out if promise rejected
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        const result = await callback();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }, seconds * 1000);
  });
}
