import { useCallback, useEffect } from 'react';
import { useCharacterStore } from '@/stores/characterStore';
import type { Character } from '@/types';

/**
 * Custom hook wrapping the character store with convenience methods
 * and automatic data fetching for a given project.
 */
export function useCharacters(projectId: string | undefined) {
  const {
    characters,
    activeCharacter,
    isLoading,
    fetchCharacters,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    setActiveCharacter,
    triggerTwinCreation,
  } = useCharacterStore();

  // Auto-fetch characters when projectId changes
  useEffect(() => {
    if (projectId) {
      fetchCharacters(projectId);
    }
  }, [projectId, fetchCharacters]);

  const create = useCallback(
    (data: Omit<Character, 'id' | 'createdAt' | 'updatedAt'>) => {
      createCharacter(data);
    },
    [createCharacter],
  );

  const update = useCallback(
    (id: string, data: Partial<Character>) => {
      updateCharacter(id, data);
    },
    [updateCharacter],
  );

  const remove = useCallback(
    (id: string) => {
      deleteCharacter(id);
    },
    [deleteCharacter],
  );

  const select = useCallback(
    (id: string) => {
      setActiveCharacter(id);
    },
    [setActiveCharacter],
  );

  const startTwinCreation = useCallback(
    (id: string, photos: string[]) => {
      triggerTwinCreation(id, photos);
    },
    [triggerTwinCreation],
  );

  /** Characters filtered to the current project. */
  const projectCharacters = projectId
    ? characters.filter((c) => c.projectId === projectId)
    : characters;

  /** Digital twins only. */
  const twins = projectCharacters.filter((c) => c.isDigitalTwin);

  /** Original (non-twin) characters only. */
  const originals = projectCharacters.filter((c) => !c.isDigitalTwin);

  return {
    characters: projectCharacters,
    twins,
    originals,
    activeCharacter,
    isLoading,
    create,
    update,
    remove,
    select,
    startTwinCreation,
  };
}
