/**
 * Function used to get entity with a specified ID from the world.
 * @param {*} id Id of the entity to find.
 * @param {EntityQueryOptions} [queryOptions] Optional query options to further specify the entity to look for.
 * @param {string[]} [dimensionIds] IDs of dimensions to look for. Defaults to all dimensions of the world.
 * @returns {Entity|undefined} Entity with the specified ID or undefined if no entity was found.
 */
function getEntityById(id,queryOptions = {},dimensionIds = DIMENSION_IDS) {
    for (let index = 0;index < dimensionIds.length;index++) {
        const dimension = world.getDimension(DIMENSION_IDS[index]);
        const entities = [...dimension.getEntities(queryOptions)];
        const entityWithId = filter(entities,(entity) => entity.id === id)[0]
        if (entityWithId != null) return entityWithId;
    }
}