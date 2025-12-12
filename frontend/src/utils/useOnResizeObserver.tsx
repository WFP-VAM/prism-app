import React from 'react';

const initialState = { width: 0, height: 0 };

function useResizeObserver<T extends HTMLElement>(
  ...depArray: unknown[]
): [
  React.RefObject<T>,
  {
    width: number;
    height: number;
  },
] {
  const [size, setSize] = React.useState(initialState);
  const targetRef = React.useRef<T>(null);

  React.useEffect(() => {
    const target = targetRef.current;
    if (!target) {
      setSize(initialState);
      return () => {};
    }

    const resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      setSize({
        width: entry.target.getBoundingClientRect().width,
        height: entry.target.getBoundingClientRect().height,
      });
    });

    resizeObserver.observe(target);

    return () => {
      resizeObserver.disconnect();
    };
  }, [...depArray]);

  return [targetRef, size];
}

export default useResizeObserver;
