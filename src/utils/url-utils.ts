import { useHistory } from 'react-router-dom';

/*
  This custom hook tracks the browser url string, which is defined by the useHistory hook.
  We created additional functions to update the url based on user events, such as select date
  or select layer.
*/
export const useUrlHistory = () => {
  const { replace, location } = useHistory();
  const urlParams = new URLSearchParams(location.search);

  const clearHistory = () => {
    replace({ search: '' });
  };

  const updateHistory = (key: string, value: string) => {
    urlParams.set(key, value);
    replace({ search: urlParams.toString() });
  };

  const removeKeyFromUrl = (key: string) => {
    urlParams.delete(key);

    if (key === 'hazardLayerId') {
      urlParams.delete('date');
    }

    replace({ search: urlParams.toString() });
  };

  return { urlParams, updateHistory, clearHistory, removeKeyFromUrl };
};

export function copyTextToClipboard(text: string): Promise<void> {
  if (navigator?.clipboard) {
    return navigator?.clipboard.writeText(text);
  }
  // If navigator.clipboard is not supported, fallback to execCommand
  const tmpElement = document.createElement('input');
  document.body.appendChild(tmpElement);
  // eslint-disable-next-line fp/no-mutation
  tmpElement.value = text;
  tmpElement.select();
  document.execCommand('copy');
  document.body.removeChild(tmpElement);
  return Promise.resolve();
}
