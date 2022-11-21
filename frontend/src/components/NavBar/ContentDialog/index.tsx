import React, { useEffect, useState } from 'react';
import parse from 'html-react-parser';
import { marked } from 'marked';
import { Dialog, DialogContent, Typography } from '@material-ui/core';

type ContentDialogProps = {
  content?: string;
  setContent: (value?: string) => void;
};

export const loadLayerContent = async (
  path: string,
  setContent: (value?: string) => void,
) => {
  const resp = await fetch(path);
  const respText = await resp.text();

  setContent(respText);
};

const ContentDialog = ({ content, setContent }: ContentDialogProps) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!content) {
      setOpen(false);
      return;
    }
    setOpen(true);
  }, [content]);

  if (!content) {
    return null;
  }

  return (
    <Dialog
      maxWidth="md"
      open={open}
      keepMounted
      onClose={() => setContent(undefined)}
      aria-labelledby="dialog-preview"
    >
      <DialogContent>
        <Typography color="textSecondary">{parse(marked(content))}</Typography>
      </DialogContent>
    </Dialog>
  );
};

export default ContentDialog;
