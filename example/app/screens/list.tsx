import {useRoute} from '@react-navigation/native';
import {FlatList, RefreshControl, Text, View} from 'react-native';
import FileRow from '../componenets/fileRow';
import {useList} from 'react-native-presigned-s3';
import React, {useMemo} from 'react';
import FolderRow from '../componenets/folderRow';
// @ts-ignore
import path from 'path-browserify';
export default function ListScreen() {
  const {params} = useRoute();
  // @ts-ignore
  const current_path = params!.path;
  const {files, loading, reload} = useList(current_path);
  const data = useMemo(
    () =>
      files
        .filter(f => {
          return (
            f.key
              .replace(current_path, '')
              .replace(new RegExp('/', 'g'), '')
              .trim() === path.basename(f.key)
          );
        })
        .sort((a, b) => {
          if (a.meta?.isFolder) {
            return -1;
          }
          if (b.meta?.isFolder) {
            return 1;
          }
          return a.name.localeCompare(b.name);
        }),
    [current_path, files],
  );

  return (
    <View
      style={{
        flex: 1,
      }}>
      <Text style={{padding: 20}}>{current_path}</Text>
      <FlatList
        style={{flexGrow: 1}}
        contentContainerStyle={{flexGrow: 1, paddingVertical: 20}}
        refreshControl={
          <RefreshControl
            tintColor={'black'}
            colors={['black']}
            refreshing={loading}
            onRefresh={reload}
          />
        }
        data={data}
        keyExtractor={item => item.key}
        renderItem={({item}) => {
          if (item.meta.isFolder) {
            return <FolderRow folderPath={item.key} name={item.name} />;
          }
          return <FileRow fileKey={item.key} {...item} />;
        }}
      />
    </View>
  );
}
