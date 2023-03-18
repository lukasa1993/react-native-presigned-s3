import {Text, TouchableOpacity, View} from 'react-native';
import React, {useCallback} from 'react';
import {useNavigation} from '@react-navigation/native';

export default function FolderRow({
  name,
  folderPath,
}: {
  name: string;
  folderPath: string;
}) {
  const navigation = useNavigation();

  const onClick = useCallback(() => {
    // @ts-ignore
    return navigation.push('List', {
      path: folderPath,
    });
  }, [folderPath, navigation]);

  return (
    <TouchableOpacity onPress={onClick}>
      <View
        style={{
          flex: 1,
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
        }}>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            paddingHorizontal: 10,
            marginBottom: 8,
          }}>
          <Text style={{flex: 1}}>
            {'📁 '}
            {name}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
