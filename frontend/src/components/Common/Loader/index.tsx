import { LinearProgress } from '@material-ui/core';
import React from 'react';

interface LoaderProps {
  showLoader: boolean;
}
const Loader = ({ showLoader }: LoaderProps) => {
  if (!showLoader) {
    return null;
  }
  return <LinearProgress />;
};

export default Loader;
