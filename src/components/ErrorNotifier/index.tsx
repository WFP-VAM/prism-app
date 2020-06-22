import React from 'react';
import { useDispatch } from 'react-redux';

function ErrorNotifier() {
  const dispatch = useDispatch();

  return <p>Hello World!</p>;
}

export default ErrorNotifier;
