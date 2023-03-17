import {Alert, Text, TouchableOpacity} from 'react-native';
import React, {useCallback} from 'react';
import {useNavigation, useRoute} from '@react-navigation/native';

export default function AddButton() {
  const navigation = useNavigation();
  const {params} = useRoute();

  const onAdd = useCallback(() => {
    Alert.alert(
      'Add File/Folder',
      'Create Folder or Upload',
      [
        {
          text: 'Create Folder',
          onPress: () => {
            Alert.prompt(
              'Create Folder',
              'Folder Name',
              [
                {
                  text: 'Create',
                  onPress: (text?: string) => {
                    // @ts-ignore
                    return navigation.push('List', {
                      // @ts-ignore
                      path: `${params!.path}/${text}`,
                    });
                  },
                },
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
              ],
              'plain-text',
            );
          },
          style: 'default',
        },
        {
          text: 'Upload',
          onPress: () => {
            // @ts-ignore
            return navigation.navigate('Upload', {path: `${params!.path}`});
          },
          style: 'default',
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      {
        cancelable: true,
      },
    );
  }, [navigation, params]);

  return (
    <TouchableOpacity onPress={() => onAdd()}>
      <Text>Add</Text>
    </TouchableOpacity>
  );
}
