import { LinearProgress } from '@material-ui/core';

interface LoaderProps {
  showLoader: boolean;
}
function Loader({ showLoader }: LoaderProps) {
  if (!showLoader) {
    return null;
  }
  return <LinearProgress />;
}

export default Loader;
