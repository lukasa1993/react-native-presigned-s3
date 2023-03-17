import React, {useCallback} from 'react';
import {View, Text, TouchableOpacity, Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import FileViewer from 'react-native-file-viewer';
import {prettyBytes} from '../utils/utils';
import {useList} from 'react-native-presigned-s3';
import {useQueryClient} from '@tanstack/react-query';
// @ts-ignore
import path from 'path-browserify';

export default function FileRow({
  name,
  url,
  meta,
}: {
  name: string;
  url: string;
  meta: any;
}) {
  const queryClient = useQueryClient();
  const {params} = useRoute();
  const navigation = useNavigation();
  const {removeFile} = useList();

  // @ts-ignore
  const current_path = params!.path;

  const onClick = useCallback(() => {
    if (meta.isFolder) {
      // @ts-ignore
      return navigation.push('List', {
        // @ts-ignore
        path: `${meta.path}`,
      });
    } else {
      return FileViewer.open(url, {
        showOpenWithDialog: true,
      });
    }
  }, [meta.isFolder, meta.path, navigation, url]);

  const onLong = useCallback(() => {
    const filePath = path.join(current_path, name);

    Alert.alert(`Deleting ${name}?`, filePath, [
      {
        text: 'I am Sure',
        onPress: () =>
          removeFile(filePath).then(() => {
            return queryClient.invalidateQueries(['list', current_path]);
          }),
        style: 'destructive',
      },
      {
        text: 'Wopsy',
        onPress: () => console.log('Cancel Pressed'),
        style: 'cancel',
      },
    ]);
  }, [current_path, name, queryClient, removeFile]);

  return (
    <TouchableOpacity onPress={onClick} onLongPress={onLong}>
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
            {meta?.isFolder ? '📁 ' : ''}
            {name}
          </Text>
          <Text>{meta?.isFolder ? '' : prettyBytes(meta?.size)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
