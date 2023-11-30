import React from 'react';

const HashText = () => (
  <p
    style={{
      position: 'absolute',
      bottom: '0',
      left: '1rem',
    }}
  >
    web hash: {JSON.stringify(process.env.REACT_APP_GIT_HASH)}
  </p>
);

export default HashText;
