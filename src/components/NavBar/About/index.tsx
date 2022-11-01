import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Typography, Grid } from '@material-ui/core';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { appConfig } from '../../../config';
import ContentDialog, { loadLayerContent } from '../ContentDialog';

const About = () => {
  const [content, setContent] = useState<string | undefined>(undefined);

  const { aboutPath } = appConfig;

  const href = aboutPath ? '' : 'https://innovation.wfp.org/project/prism';
  const handler = aboutPath
    ? (event: any) => {
        event.preventDefault();
        loadLayerContent(aboutPath, setContent);
      }
    : undefined;

  return (
    <Grid item key="About">
      <Typography
        variant="body2"
        component="a"
        target="_blank"
        href={href}
        onClick={handler}
      >
        <FontAwesomeIcon icon={faInfoCircle} /> About
      </Typography>
      <ContentDialog content={content} setContent={setContent} />
    </Grid>
  );
};

export default About;
