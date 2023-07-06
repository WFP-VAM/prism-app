import React, { useCallback, useState, MouseEvent, memo, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Typography, Grid } from '@material-ui/core';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { useDispatch } from 'react-redux';
import { appConfig } from 'config';
import ContentDialog from 'components/NavBar/ContentDialog';
import { useSafeTranslation } from 'i18n';
import { loadLayerContent } from 'utils/load-layer-utils';

const About = memo(() => {
  const [content, setContent] = useState<string | undefined>(undefined);
  const { t } = useSafeTranslation();
  const { aboutPath } = appConfig;
  const dispatch = useDispatch();

  const href = aboutPath ? '' : 'https://innovation.wfp.org/project/prism';

  const handler = useCallback(
    async (event: MouseEvent<HTMLAnchorElement>) => {
      if (!aboutPath) {
        return;
      }
      event.preventDefault();
      const layerContent = await loadLayerContent(aboutPath, dispatch);
      setContent(layerContent);
    },
    [aboutPath, dispatch],
  );

  const handleDialogClose = useCallback(() => {
    setContent(undefined);
  }, []);

  const renderedContentDialog = useMemo(() => {
    if (!content) {
      return null;
    }
    return <ContentDialog content={content} handleClose={handleDialogClose} />;
  }, [content, handleDialogClose]);

  return (
    <Grid item key="About">
      <Typography
        variant="body2"
        component="a"
        target="_blank"
        href={href}
        onClick={handler}
      >
        <FontAwesomeIcon icon={faInfoCircle} /> {t('About')}
      </Typography>
      {renderedContentDialog}
    </Grid>
  );
});

export default About;
