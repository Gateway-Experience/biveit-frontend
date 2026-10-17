import { useCallback } from 'react';
import _ from 'lodash';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useStore } from 'src/state-store';
import { getProjectFolders, getProjects } from 'src/services/project';
import type { Project, ProjectFolder } from 'src/types/project';

// Intentions: one copy of the user's projects and folders, shared by everything that lists them (the
// sidebar and the projects page), so a rename or a pin in one shows up in the other straight away. The
// keys carry the user's id, so whoever signs in next on this browser never sees the last person's list.
function _projectsKey(userId: unknown) {
  return ['projects', userId];
}

function _foldersKey(userId: unknown) {
  return ['project-folders', userId];
}

function useCurrentUserId() {
  const user = useStore(state => state.user);
  return user?.id;
}

// The current user's projects (undefined while loading). Only fetched once someone is signed in.
// staleTime 0: the cache is persisted, so a reload or a new tab shows the last list instantly, but it can be
// behind (another tab made a project), so it's always checked again in the background.
function useProjects() {
  const userId = useCurrentUserId();
  return useQuery({ queryKey: _projectsKey(userId), queryFn: getProjects, enabled: !_.isNil(userId), staleTime: 0 });
}

function useProjectFolders() {
  const userId = useCurrentUserId();
  return useQuery({ queryKey: _foldersKey(userId), queryFn: getProjectFolders, enabled: !_.isNil(userId), staleTime: 0 });
}

// Intentions: put the BE's answer to an edit straight into the shared lists, instead of refetching them.
// Each takes what the BE returned (or the id that's gone).
function useProjectListUpdaters() {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();

  const setProject = useCallback((project: Project) => {
    queryClient.setQueryData<Project[]>(_projectsKey(userId), previous => _.map(previous, item => (item.id === project.id ? project : item)));
  }, [queryClient, userId]);

  const removeProject = useCallback((projectId: number) => {
    queryClient.setQueryData<Project[]>(_projectsKey(userId), previous => _.reject(previous, { id: projectId }));
  }, [queryClient, userId]);

  // A brand new project: simplest to fetch the list again (it comes sorted).
  const reloadProjects = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: _projectsKey(userId) });
  }, [queryClient, userId]);

  const setFolder = useCallback((folder: ProjectFolder) => {
    queryClient.setQueryData<ProjectFolder[]>(_foldersKey(userId), previous => (
      _.some(previous, { id: folder.id })
        ? _.map(previous, item => (item.id === folder.id ? folder : item))
        : [...(previous || []), folder]
    ));
  }, [queryClient, userId]);

  // Its projects keep their folder_id; with the folder gone from the list they simply show as unfiled.
  const removeFolder = useCallback((folderId: number) => {
    queryClient.setQueryData<ProjectFolder[]>(_foldersKey(userId), previous => _.reject(previous, { id: folderId }));
  }, [queryClient, userId]);

  return { setProject, removeProject, reloadProjects, setFolder, removeFolder };
}

// [Pure] Splits the projects into the sidebar's sections; each project lands in exactly one. Pinned
// (newest pin first) wins over a folder; a folder that's gone counts as none; the rest are the recents,
// most recently edited first.
function groupProjectsForSidebar(projects: Project[] | undefined, folders: ProjectFolder[] | undefined) {
  const liveFolderIds = new Set(_.map(folders, 'id'));
  const [pinned, unpinned] = _.partition(projects, project => !_.isNil(project.pinned_at));
  const [filed, recents] = _.partition(unpinned, project => liveFolderIds.has(project.folder_id as number));
  return {
    pinned: _.orderBy(pinned, ['pinned_at'], ['desc']),
    byFolderId: _.groupBy(_.orderBy(filed, ['updated_at'], ['desc']), 'folder_id'),
    recents: _.orderBy(recents, ['updated_at'], ['desc']),
  };
}

export {
  groupProjectsForSidebar,
  useProjectFolders,
  useProjectListUpdaters,
  useProjects,
};
