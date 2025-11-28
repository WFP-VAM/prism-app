import { memo, useEffect, useRef, useState } from 'react';
import parse from 'html-react-parser';
import { marked } from 'marked';
import { Dialog, DialogContent, Typography } from '@mui/material';

type ContentDialogProps = {
  content: string;
  handleClose: () => void;
  elementId?: string;
};

const ContentDialog = memo(
  ({ content, handleClose, elementId }: ContentDialogProps) => {
    const [open, setOpen] = useState(false);

    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (!content) {
        setOpen(false);
        return;
      }
      setOpen(true);
    }, [content]);

    useEffect(() => {
      if (!open || !elementId) {
        return;
      }
      (
        document.querySelector(`#${elementId}`) as HTMLHeadingElement
      ).scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, [elementId, open]);

    return (
      <Dialog
        maxWidth="md"
        open={open}
        keepMounted
        onClose={handleClose}
        aria-labelledby="dialog-preview"
      >
        <DialogContent>
          <Typography ref={contentRef} component="div" color="textSecondary">
            {parse(marked(content))}
          </Typography>
        </DialogContent>
      </Dialog>
    );
  },
);

export default ContentDialog;
