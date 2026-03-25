import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import {
    NativeSyntheticEvent,
    StyleProp,
    StyleSheet,
    TextInput,
    TextInputKeyPressEventData,
    TextInputProps,
    View,
    ViewStyle,
} from 'react-native';

export interface OtpCodeInputRef {
  focus: (index?: number) => void;
  blurAll: () => void;
}

interface OtpCodeInputProps {
  value: string;
  onChange: (nextValue: string) => void;
  length?: number;
  autoFocus?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: TextInputProps['style'];
  filledInputStyle?: TextInputProps['style'];
  keyboardType?: TextInputProps['keyboardType'];
  editable?: boolean;
}

const DIGIT_REGEX = /^\d+$/;

const OtpCodeInput = forwardRef<OtpCodeInputRef, OtpCodeInputProps>(function OtpCodeInput(
  {
    value,
    onChange,
    length = 6,
    autoFocus = false,
    containerStyle,
    inputStyle,
    filledInputStyle,
    keyboardType = 'number-pad',
    editable = true,
  },
  ref,
) {
  const inputRefs = useRef<Array<TextInput | null>>([]);

  useImperativeHandle(ref, () => ({
    focus: (index = 0) => {
      const nextIndex = Math.max(0, Math.min(index, length - 1));
      inputRefs.current[nextIndex]?.focus();
    },
    blurAll: () => {
      inputRefs.current.forEach((input) => input?.blur());
    },
  }), [length]);

  const setValueAt = (index: number, char: string) => {
    const nextChars = Array.from({ length }, (_, i) => value[i] || '');
    nextChars[index] = char;
    onChange(nextChars.join('').trimEnd());
  };

  const fillFrom = (startIndex: number, digits: string) => {
    const nextChars = Array.from({ length }, (_, i) => value[i] || '');
    const limited = digits.slice(0, length - startIndex).split('');
    limited.forEach((digit, offset) => {
      nextChars[startIndex + offset] = digit;
    });
    onChange(nextChars.join('').trimEnd());

    const nextFocus = Math.min(startIndex + limited.length, length - 1);
    inputRefs.current[nextFocus]?.focus();
  };

  const handleChangeText = (index: number, text: string) => {
    if (!editable) {
      return;
    }

    if (!text) {
      setValueAt(index, '');
      return;
    }

    if (!DIGIT_REGEX.test(text)) {
      return;
    }

    if (text.length > 1) {
      fillFrom(index, text);
      return;
    }

    setValueAt(index, text);
    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (
    index: number,
    event: NativeSyntheticEvent<TextInputKeyPressEventData>,
  ) => {
    if (!editable) {
      return;
    }

    if (event.nativeEvent.key !== 'Backspace') {
      return;
    }

    if (value[index]) {
      setValueAt(index, '');
      return;
    }

    if (index > 0) {
      setValueAt(index - 1, '');
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {Array.from({ length }).map((_, index) => {
        const char = value[index] || '';
        return (
          <TextInput
            key={index}
            ref={(input) => {
              inputRefs.current[index] = input;
            }}
            keyboardType={keyboardType}
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={Math.max(1, length)}
            value={char}
            onChangeText={(text) => handleChangeText(index, text)}
            onKeyPress={(event) => handleKeyPress(index, event)}
            style={[inputStyle, char ? filledInputStyle : undefined]}
            autoFocus={autoFocus && index === 0}
            editable={editable}
            selectTextOnFocus
          />
        );
      })}
    </View>
  );
});

export default OtpCodeInput;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
