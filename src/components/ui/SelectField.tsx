import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    StyleProp,
    StyleSheet,
    Text,
    TextStyle,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export interface SelectFieldProps {
  label?: string;
  value: string;
  isPlaceholder?: boolean;
  onPress: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  rowStyle?: StyleProp<ViewStyle>;
  valueTextStyle?: StyleProp<TextStyle>;
  placeholderTextStyle?: StyleProp<TextStyle>;
  leftIconName?: IconName;
  leftIconColor?: string;
  leftIconSize?: number;
  leftIconStyle?: StyleProp<TextStyle>;
  showChevron?: boolean;
  isExpanded?: boolean;
  chevronColor?: string;
  activeOpacity?: number;
  disabled?: boolean;
}

export default function SelectField({
  label,
  value,
  isPlaceholder = false,
  onPress,
  containerStyle,
  labelStyle,
  rowStyle,
  valueTextStyle,
  placeholderTextStyle,
  leftIconName,
  leftIconColor = '#64748B',
  leftIconSize = 18,
  leftIconStyle,
  showChevron = true,
  isExpanded = false,
  chevronColor = '#94A3B8',
  activeOpacity = 0.85,
  disabled = false,
}: SelectFieldProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={activeOpacity}
      style={containerStyle}
      disabled={disabled}
    >
      {label ? <Text style={labelStyle}>{label}</Text> : null}

      <View style={[styles.valueRow, rowStyle]}>
        {leftIconName ? (
          <Ionicons
            name={leftIconName}
            size={leftIconSize}
            color={leftIconColor}
            style={leftIconStyle}
          />
        ) : null}

        <Text
          style={[
            styles.valueText,
            valueTextStyle,
            isPlaceholder ? placeholderTextStyle : undefined,
          ]}
        >
          {value}
        </Text>

        {showChevron ? (
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={chevronColor}
          />
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  valueText: {
    flex: 1,
    fontSize: 15,
  },
});
