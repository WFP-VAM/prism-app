import { formatExportUrlForClipboard } from './batchExportUrls';

describe('formatExportUrlForClipboard', () => {
  it('decodes query params for readable clipboard text', () => {
    const url =
      'http://localhost:3000/mozambique/export?date=2024-05-01&bounds=30%2C-26%2C41%2C-10&title=Mozambique%20-%20%7Bdate_coverage%7D';

    expect(formatExportUrlForClipboard(url)).toContain('bounds=30,-26,41,-10');
    expect(formatExportUrlForClipboard(url)).toContain(
      'title=Mozambique - {date_coverage}',
    );
    expect(formatExportUrlForClipboard(url)).not.toContain('%2C');
    expect(formatExportUrlForClipboard(url)).not.toContain('%7B');
  });
});
