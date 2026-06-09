import { Button, Typography } from '@material-ui/core';
import { useSafeTranslation } from 'i18n';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { PRISM_SIGN_OUT_URL } from 'utils/constants';
import {
  fetchPrismWhoami,
  invalidatePrismWhoamiSession,
} from 'utils/prismWhoamiSession';

import { invalidateScheduleWhoamiSession } from '../PrintImage/scheduleWhoamiSession';

function PrismLogoutLink() {
  const { t } = useSafeTranslation();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchPrismWhoami().then(whoami => {
      if (!cancelled) {
        setIsAuthenticated(whoami !== null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.search]);

  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = () => {
    invalidatePrismWhoamiSession();
    invalidateScheduleWhoamiSession();
    const returnUrl = `${window.location.origin}${location.pathname}${location.search}`;
    window.location.assign(
      `${PRISM_SIGN_OUT_URL}?next=${encodeURIComponent(returnUrl)}`,
    );
  };

  return (
    <Button
      onClick={handleLogout}
      style={{
        color: 'white',
        textTransform: 'none',
        minWidth: 0,
        padding: '6px 8px',
      }}
    >
      <Typography
        style={{
          color: '#FFFF',
          textTransform: 'none',
        }}
      >
        {t('Logout')}
      </Typography>
    </Button>
  );
}

export default PrismLogoutLink;
