import React, { useCallback, useState, MouseEvent, memo, useMemo } from 'react';
import InfoOutlinedIcon from '@material-ui/icons/InfoOutlined';
import { Button, Hidden, Typography } from '@material-ui/core';
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
    <Button
      key="About"
      style={{ fontSize: '1.25rem' }}
      component="a"
      target="_blank"
      href={href}
      onClick={handler}
      startIcon={<InfoOutlinedIcon style={{ fontSize: '1.5rem' }} />}
    >
      <Hidden smDown>
        <Typography color="secondary">{t('About')}</Typography>
      </Hidden>
      {renderedContentDialog}
    </Button>
  );
});

export default About;
