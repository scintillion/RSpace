<script lang="ts">
    import RSIEditor from '../../components/tiles/EditorRSI.svelte';
    // import { RS1 } from '../../lib/RS';
    import { RS1 } from '../../lib/RS';
    import { mount } from 'svelte';

	let CLString =
    'Test|Name:[%=John]Your Name|XY:[#=123]A Number Value|Member:[@Test1=ListNum]TestMem|Set:[{Test1=ListNum,Test1Name}]TestSet|';
    let RSI = new RS1.RSI(CLString);    
    

    const modalContent = document.createElement('div');
    modalContent.style.position = 'absolute';
    modalContent.style.top = '40%';
    modalContent.style.left = '50%';
    modalContent.style.transform = 'translate(-50%, -50%)';
    modalContent.style.backgroundColor = 'rgba(249, 240, 246)';
    modalContent.style.padding = '20px';
    modalContent.style.borderRadius = '5px';
    modalContent.style.zIndex = '1';
    document.body.appendChild(modalContent);

    if (modalContent) {
        const editorComponent = mount(RSIEditor,({
                target: modalContent,
                props: {
                    RSI: RSI,
                    modalContent: modalContent,
                },
            }));
    //     editorComponent.$on('close', () => {
    //     modalContent.remove();
    //     // modalBackground.remove();
    //     //unsubscribe();
    // });
    }

</script>

<!-- <QEditor {CLString} /> -->

<!-- <div class="modal-content" /> -->


