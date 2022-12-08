import React from 'react';

interface TitleParams {
  text: string;
}

export default ({ params }: { params: TitleParams }) => <h4>{params.text}</h4>;
