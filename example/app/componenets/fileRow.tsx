import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, Text, TouchableOpacity, Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import FileViewer from 'react-native-file-viewer';
import {prettyBytes} from '../utils/utils';
import {useList} from 'react-native-presigned-s3';
import type {S3Item} from 'react-native-presigned-s3';

export default function FileRow({
  fileKey: key,
  name,
  filePath,
  existsLocally,
  state: type,
  progress,
  meta,
}: S3Item & {fileKey: string}) {
  const navigation = useNavigation();
  const [openAfterDownload, setOpenAfterDownload] = useState(false);

  const {removeFile, files, addDownload} = useList(key, {
    progress: true,
  });
  const file = useMemo(() => files[0] || {}, [files]);

  const pathFile = file.filePath || filePath;
  const locallyExists = file.existsLocally || existsLocally;
  const fileProgress = file?.progress || progress;

  const onClick = useCallback(() => {
    if (meta?.isFolder) {
      // @ts-ignore
      return navigation.push('List', {
        // @ts-ignore
        path: `${meta?.path}`,
      });
    } else {
      if (pathFile && locallyExists) {
        return FileViewer.open(pathFile, {
          showOpenWithDialog: true,
        });
      } else {
        setOpenAfterDownload(true);
        return addDownload(key);
      }
    }
  }, [meta.isFolder, meta.path, navigation, addDownload, key]);

  useEffect(() => {
    if (openAfterDownload && pathFile && locallyExists) {
      setOpenAfterDownload(false);
      FileViewer.open(pathFile, {
        showOpenWithDialog: true,
      }).catch(e => console.error(e));
    }
  }, [locallyExists, pathFile, openAfterDownload]);

  const onLong = useCallback(() => {
    Alert.alert(`Deleting ${name}?`, key, [
      {
        text: 'I am Sure',
        onPress: () => removeFile(key),
        style: 'destructive',
      },
      {
        text: 'Wopsy',
        style: 'cancel',
      },
    ]);
  }, [key, name, removeFile]);

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
          {!fileProgress && (
            <Text>{meta?.isFolder ? '' : prettyBytes(meta?.size || 0)}</Text>
          )}
          {!!fileProgress && (
            <Text>
              {parseFloat(`${fileProgress}`).toFixed(2)}%{' '}
              {type === 'uploading' ? '↑' : '↓'}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
