import type { Meta, StoryObj } from '@storybook/react'
import { WeaponCard } from './index'

const sample = {
  id: 'm4a1',
  name: 'M4A1',
  description: 'Sample description...',
  weaponGroup: { name: 'Assault Rifle' },
  weaponType: { name: 'AR' },
};

const meta: Meta<typeof WeaponCard> = {
  title: 'BF6 UI/Components/WeaponCard',
  component: WeaponCard,
};
export default meta;

type Story = StoryObj<typeof WeaponCard>;

export const Default: Story = {
  args: {
    weapon: sample as any,
    tier: 'META'
  }
};