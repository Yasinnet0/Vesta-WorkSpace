import React from 'react';
import GridPage from './GridPage';
import { getIdeas, addIdea, updateIdea, deleteIdea, getCategories } from '../api';

const Ideas = () => {
  return (
    <GridPage 
      title="Ideas"
      subtitle="Raw ideas, future concepts, and unrefined sparks of inspiration."
      fetchData={() => Promise.all([getIdeas(), getCategories()])}
      deleteItem={deleteIdea}
      addItem={addIdea}
      updateItem={updateIdea}
      categoryKey="ideas"
      accentColor="amber"
      label="Inspiration"
    />
  );
};

export default Ideas;
