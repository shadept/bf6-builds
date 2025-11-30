import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardTitle, CardContent } from './index';

const meta: Meta<typeof Card> = {
  title: 'BF6 UI/Primitives/Card',
  component: Card,
  argTypes: {
    className: { control: 'text' },
  },
};
export default meta;

export const Default: StoryObj<typeof Card> = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
      </CardHeader>
      <CardContent>Card content...</CardContent>
    </Card>
  ),
};
