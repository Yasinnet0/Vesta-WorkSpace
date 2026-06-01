import React from 'react';
import GridPage from './GridPage';
import { getNotes, addNote, updateNote, deleteNote, getCategories } from '../api';

const Notes = () => {
  return (
    <GridPage 
      title="Notes"
      subtitle="Your personal digital library and technical documentation snippets."
      fetchData={() => Promise.all([getNotes(), getCategories()])}
      deleteItem={deleteNote}
      addItem={addNote}
      updateItem={updateNote}
      categoryKey="notes"
      accentColor="cyan"
      label="Documentation"
    />
  );
};

export default Notes;
