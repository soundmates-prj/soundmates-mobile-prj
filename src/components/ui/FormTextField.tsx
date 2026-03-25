import { Ionicons } from '@expo/vector-icons';
import React, { forwardRef, useMemo, useState } from 'react';
import {
    StyleProp,
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    TextStyle,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface FormTextFieldProps extends TextInputProps {
  containerStyle?: StyleProp<ViewStyle>;
  size?: number | `${number}%` | 'auto';
  inputContainerStyle?: StyleProp<ViewStyle>;
  leftIconName?: IconName;
  leftIconColor?: string;
  leftIconSize?: number;
  rightElement?: React.ReactNode;
  showPasswordToggle?: boolean;
  passwordIconColor?: string;
  errorMessage?: string;
  errorTextStyle?: StyleProp<TextStyle>;
}

const FormTextField = forwardRef<TextInput, FormTextFieldProps>(function FormTextField({
  containerStyle,
  size,
  inputContainerStyle,
  leftIconName,
  leftIconColor = '#64748B',
  leftIconSize = 20,
  rightElement,
  showPasswordToggle = false,
  passwordIconColor = '#94A3B8',
  errorMessage,
  style,
  secureTextEntry,
  errorTextStyle,
  ...textInputProps
}, ref) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const shouldMaskPassword = useMemo(() => {
    if (!showPasswordToggle) {
      return secureTextEntry;
    }
    return !isPasswordVisible;
  }, [showPasswordToggle, secureTextEntry, isPasswordVisible]);

  return (
    <View style={[size !== undefined ? { width: size } : null, containerStyle]}>
      <View style={[styles.inputContainer, inputContainerStyle]}>
        {leftIconName ? (
          <Ionicons
            name={leftIconName}
            size={leftIconSize}
            color={leftIconColor}
            style={styles.leftIcon}
          />
        ) : null}

        <TextInput
          ref={ref}
          {...textInputProps}
          secureTextEntry={shouldMaskPassword}
          style={[styles.input, style]}
        />

        {rightElement}

        {showPasswordToggle ? (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible((prev) => !prev)}
            style={styles.rightButton}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={passwordIconColor}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {errorMessage ? (
        <Text style={[styles.errorText, errorTextStyle]}>{errorMessage}</Text>
      ) : null}
    </View>
  );
});

export default FormTextField;

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
  },
  rightButton: {
    padding: 4,
    marginLeft: 6,
  },
  errorText: {
    marginTop: 6,
    color: '#EF4444',
    fontSize: 12,
  },
});
