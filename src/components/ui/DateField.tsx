import React from 'react';
import SelectField, { type SelectFieldProps } from './SelectField';

type DateFieldProps = Omit<SelectFieldProps, 'leftIconName'> & {
  leftIconName?: SelectFieldProps['leftIconName'];
};

export default function DateField(props: DateFieldProps) {
  return <SelectField {...props} />;
}
